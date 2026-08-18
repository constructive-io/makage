import fs from 'node:fs/promises';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

import { Catalogs, DEFAULT_CATALOG, getCatalogSpec, parseCatalogSpec, readCatalogs, setCatalogSpec } from './catalogs';
import { findWorkspacePackageFiles } from './workspacePatterns';

const WORKSPACE_FILE = 'pnpm-workspace.yaml';

const DEPENDENCY_TYPES = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
] as const;

interface PnpmWorkspace {
  packages?: string[];
}

interface TargetWorkspace {
  file: string;
  content: string;
  patterns: string[];
  catalogs: Catalogs;
}

interface CatalogBump {
  catalog: string;
  depName: string;
  newSpec: string;
}

interface WorkspacePackage {
  name: string;
  version: string;
  path: string;
}

interface MatchedDep {
  name: string;
  currentVersion: string;
  availableVersion: string;
  depType: string;
  consumer: string;
  file: string;
  outdated: boolean;
  /** set when the spec came from a pnpm catalog rather than the manifest */
  catalog?: string;
}

export interface UpdateDepsOptions {
  from: string;
  in: string;
  dryRun?: boolean;
  quiet?: boolean;
}

export interface UpdateDepsResult {
  sourcePackages: WorkspacePackage[];
  matchedPackages: MatchedDep[];
  outdatedPackages: MatchedDep[];
  updatedFiles: string[];
  warnings: string[];
  dry_run: boolean;
  has_dep_changes: boolean;
}

function parseArgs(args: string[]): { from: string; in: string; dryRun: boolean } {
  let from = '';
  let targetIn = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      from = args[++i];
    } else if (args[i] === '--in' && args[i + 1]) {
      targetIn = args[++i];
    } else if (args[i] === '--dry-run' || args[i] === '--check') {
      dryRun = true;
    }
  }

  if (!from) {
    throw new Error('Missing required argument: --from <path-to-source-workspace>');
  }
  if (!targetIn) {
    throw new Error('Missing required argument: --in <path-to-target-repo>');
  }

  return { from, in: targetIn, dryRun };
}

async function getWorkspacePackages(workspaceRoot: string): Promise<WorkspacePackage[]> {
  const workspaceFile = path.join(workspaceRoot, WORKSPACE_FILE);

  let workspaceConfig: PnpmWorkspace;
  try {
    const content = await fs.readFile(workspaceFile, 'utf-8');
    workspaceConfig = parseYaml(content) as PnpmWorkspace;
  } catch {
    throw new Error(`No "pnpm-workspace.yaml" found in ${workspaceRoot}`);
  }

  const patterns = workspaceConfig.packages;
  if (!patterns || patterns.length === 0) {
    throw new Error('No package patterns found in pnpm-workspace.yaml');
  }

  const packageFiles = await findWorkspacePackageFiles(workspaceRoot, patterns);

  const packages: WorkspacePackage[] = [];
  for (const file of packageFiles) {
    const pkgPath = path.join(workspaceRoot, file);
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name) {
      packages.push({
        name: pkg.name,
        version: pkg.version || '0.0.0',
        path: path.dirname(file)
      });
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function stripVersionPrefix(version: string): string {
  return version.replace(/^[\^~>=<]*/, '');
}

function compareSemver(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const av = aParts[i] || 0;
    const bv = bParts[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }

  return 0;
}

function isOutdated(currentSpec: string, availableVersion: string): boolean {
  // workspace: protocol means it's managed by pnpm workspace — always in sync
  if (currentSpec.startsWith('workspace:')) return false;

  const current = stripVersionPrefix(currentSpec);
  if (!current || current === '*') return false;

  return compareSemver(availableVersion, current) > 0;
}

function detectIndent(content: string): string {
  const match = content.match(/^(\s+)"/m);
  return match ? match[1] : '  ';
}

function applyVersionPrefix(currentSpec: string, newVersion: string): string {
  const prefix = currentSpec.match(/^[\^~>=<]*/)?.[0] ?? '';
  return `${prefix}${newVersion}`;
}

async function readTargetWorkspace(targetRoot: string): Promise<TargetWorkspace | null> {
  const file = path.join(targetRoot, WORKSPACE_FILE);
  let content: string;
  try {
    content = await fs.readFile(file, 'utf-8');
  } catch {
    return null;
  }

  let patterns: string[] = [];
  try {
    patterns = (parseYaml(content) as PnpmWorkspace)?.packages ?? [];
  } catch {
    patterns = [];
  }

  return { file, content, patterns, catalogs: readCatalogs(content) };
}

async function getTargetPackageFiles(targetRoot: string, workspace: TargetWorkspace | null): Promise<string[]> {
  if (workspace && workspace.patterns.length > 0) {
    const files = await findWorkspacePackageFiles(targetRoot, workspace.patterns);
    // Also include the root package.json
    return ['package.json', ...files];
  }

  // No workspace — scan for all package.json files recursively
  const allFiles = await findWorkspacePackageFiles(targetRoot, ['**']);

  // Always include root package.json first if it exists
  if (allFiles.includes('package.json')) {
    return ['package.json', ...allFiles.filter(f => f !== 'package.json')];
  }

  return allFiles.length > 0 ? allFiles : ['package.json'];
}

export async function runUpdateDeps(args: string[]): Promise<UpdateDepsResult> {
  const opts = parseArgs(args);
  const result = await updateDeps(opts);

  // Output structured JSON to stdout (logs go to stderr)
  console.log(JSON.stringify(result, null, 2));

  return result;
}

export async function updateDeps(opts: UpdateDepsOptions): Promise<UpdateDepsResult> {
  const log = (msg: string) => {
    if (!opts.quiet) console.error(msg);
  };
  const fromRoot = path.resolve(opts.from);
  const targetRoot = path.resolve(opts.in);

  // Step 1: Get all packages from source workspace
  const sourcePackages = await getWorkspacePackages(fromRoot);

  // A source workspace may contain multiple versions of the same package
  // (e.g. versioned subdirectories). Pick the highest version as the source
  // of truth for dependency updates.
  const sourceMap = new Map<string, WorkspacePackage>();
  for (const pkg of sourcePackages) {
    const existing = sourceMap.get(pkg.name);
    if (!existing || compareSemver(pkg.version, existing.version) > 0) {
      sourceMap.set(pkg.name, pkg);
    }
  }

  log(`[makage] Found ${sourcePackages.length} packages in source workspace`);

  // Step 2: Scan target repo's package.json files
  const workspace = await readTargetWorkspace(targetRoot);
  const targetFiles = await getTargetPackageFiles(targetRoot, workspace);
  const matchedPackages: MatchedDep[] = [];
  const updatedFiles: string[] = [];
  const warnings: string[] = [];

  // A cataloged dependency is declared once in pnpm-workspace.yaml and consumed
  // by many manifests: report and bump it once, keyed by catalog + dep name.
  const catalogMatches = new Map<string, MatchedDep>();
  const catalogBumps: CatalogBump[] = [];

  for (const file of targetFiles) {
    const pkgPath = path.join(targetRoot, file);
    let content: string;
    try {
      content = await fs.readFile(pkgPath, 'utf-8');
    } catch {
      continue;
    }
    const pkg = JSON.parse(content);
    const consumer = pkg.name || file;
    let fileChanged = false;

    for (const depType of DEPENDENCY_TYPES) {
      if (!pkg[depType]) continue;
      for (const [depName, depVersion] of Object.entries(pkg[depType])) {
        const source = sourceMap.get(depName);
        if (!source) continue;

        const currentVersion = depVersion as string;

        // `catalog:` / `catalog:<name>` — the version lives in pnpm-workspace.yaml,
        // so resolve it there and bump the catalog entry instead of the manifest.
        // A manifest that pins an explicit range instead of using the catalog is
        // handled by the normal path below: the override is deliberate, but it is
        // still a version we own, so it gets bumped in place.
        const catalogName = parseCatalogSpec(currentVersion);
        if (catalogName) {
          const key = `${catalogName}\u0000${depName}`;
          if (catalogMatches.has(key)) continue;

          const catalogSpec = workspace ? getCatalogSpec(workspace.catalogs, catalogName, depName) : undefined;
          if (catalogSpec === undefined) {
            const label = catalogName === DEFAULT_CATALOG ? 'catalog' : `catalogs.${catalogName}`;
            const warning = `${consumer} (${depType}) requests "${depName}": "${currentVersion}" but ${label} has no entry for it in ${WORKSPACE_FILE} — cannot check for updates`;
            warnings.push(warning);
            log(`[makage] WARNING ${warning}`);
            continue;
          }

          const catalogOutdated = isOutdated(catalogSpec, source.version);
          const catalogMatch: MatchedDep = {
            name: depName,
            currentVersion: catalogSpec,
            availableVersion: source.version,
            depType,
            consumer: currentVersion,
            file: WORKSPACE_FILE,
            outdated: catalogOutdated,
            catalog: catalogName
          };
          catalogMatches.set(key, catalogMatch);
          matchedPackages.push(catalogMatch);

          if (catalogOutdated) {
            catalogBumps.push({
              catalog: catalogName,
              depName,
              newSpec: applyVersionPrefix(catalogSpec, source.version)
            });
          }
          continue;
        }

        const outdated = isOutdated(currentVersion, source.version);
        matchedPackages.push({
          name: depName,
          currentVersion,
          availableVersion: source.version,
          depType,
          consumer,
          file,
          outdated
        });

        if (outdated && !opts.dryRun) {
          pkg[depType][depName] = applyVersionPrefix(currentVersion, source.version);
          fileChanged = true;
        }
      }
    }

    if (fileChanged) {
      const indent = detectIndent(content);
      const trailingNewline = content.endsWith('\n') ? '\n' : '';
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, indent) + trailingNewline);
      updatedFiles.push(file);
      log(`[makage] Updated ${file}`);
    }
  }

  if (workspace && catalogBumps.length > 0 && !opts.dryRun) {
    let content = workspace.content;
    let changed = false;

    for (const bump of catalogBumps) {
      const next = setCatalogSpec(content, bump.catalog, bump.depName, bump.newSpec);
      if (next === null) {
        const warning = `Could not rewrite ${bump.depName} in ${WORKSPACE_FILE} (catalog "${bump.catalog}")`;
        warnings.push(warning);
        log(`[makage] WARNING ${warning}`);
        continue;
      }
      content = next;
      changed = true;
    }

    if (changed) {
      await fs.writeFile(workspace.file, content);
      updatedFiles.push(WORKSPACE_FILE);
      log(`[makage] Updated ${WORKSPACE_FILE}`);
    }
  }

  const outdatedPackages = matchedPackages.filter(p => p.outdated);

  const result: UpdateDepsResult = {
    sourcePackages,
    matchedPackages,
    outdatedPackages,
    updatedFiles,
    warnings,
    dry_run: Boolean(opts.dryRun),
    has_dep_changes: outdatedPackages.length > 0
  };

  log(
    `[makage] ${matchedPackages.length} matched, ${outdatedPackages.length} outdated` +
      (opts.dryRun ? ' (dry run — no files written)' : `, ${updatedFiles.length} file(s) updated`)
  );

  return result;
}
