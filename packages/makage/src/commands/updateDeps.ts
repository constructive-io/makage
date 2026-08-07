import fs from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'glob';
import { parse as parseYaml } from 'yaml';

const DEPENDENCY_TYPES = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
] as const;

interface PnpmWorkspace {
  packages?: string[];
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
  const workspaceFile = path.join(workspaceRoot, 'pnpm-workspace.yaml');

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

  const packageJsonPatterns = patterns.map(p => {
    const normalized = p.replace(/\/?\*\*?$/, '');
    return `${normalized}/*/package.json`;
  });

  const packageFiles = await glob(packageJsonPatterns, {
    cwd: workspaceRoot,
    absolute: false,
    ignore: ['**/node_modules/**']
  });

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

async function getTargetPackageFiles(targetRoot: string): Promise<string[]> {
  // Check if target has pnpm-workspace.yaml (monorepo)
  const workspaceFile = path.join(targetRoot, 'pnpm-workspace.yaml');
  try {
    const content = await fs.readFile(workspaceFile, 'utf-8');
    const config = parseYaml(content) as PnpmWorkspace;
    const patterns = config.packages;
    if (patterns && patterns.length > 0) {
      const packageJsonPatterns = patterns.map(p => {
        const normalized = p.replace(/\/?\*\*?$/, '');
        return `${normalized}/*/package.json`;
      });
      // Also include the root package.json
      const files = await glob(packageJsonPatterns, {
        cwd: targetRoot,
        absolute: false,
        ignore: ['**/node_modules/**']
      });
      return ['package.json', ...files];
    }
  } catch {
    // Not a monorepo — fall through
  }

  // No workspace — scan for all package.json files recursively
  const allFiles = await glob('**/package.json', {
    cwd: targetRoot,
    absolute: false,
    ignore: ['**/node_modules/**']
  });

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
  const targetFiles = await getTargetPackageFiles(targetRoot);
  const matchedPackages: MatchedDep[] = [];
  const updatedFiles: string[] = [];

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

  const outdatedPackages = matchedPackages.filter(p => p.outdated);

  const result: UpdateDepsResult = {
    sourcePackages,
    matchedPackages,
    outdatedPackages,
    updatedFiles,
    dry_run: Boolean(opts.dryRun),
    has_dep_changes: outdatedPackages.length > 0
  };

  log(
    `[makage] ${matchedPackages.length} matched, ${outdatedPackages.length} outdated` +
      (opts.dryRun ? ' (dry run — no files written)' : `, ${updatedFiles.length} file(s) updated`)
  );

  return result;
}
