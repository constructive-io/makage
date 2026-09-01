import fs from 'node:fs/promises';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

import { findWorkspaceRoot } from './workspace';
import { findWorkspacePackageFiles } from './workspacePatterns';

interface WorkspaceLeak {
  field: string;
  name: string;
  value: string;
}

const DEP_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const WORKSPACE_FILE = 'pnpm-workspace.yaml';

export async function runCheckPublish(args: string[]) {
  const strict = args.includes('--strict');
  const target = args.find((arg) => !arg.startsWith('-')) || path.join('dist', 'package.json');

  let raw: string;
  try {
    raw = await fs.readFile(target, 'utf8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`${target} not found — run "makage build" first`);
    }
    throw err;
  }

  const pkg = JSON.parse(raw);
  const leaks = findWorkspaceLeaks(pkg);

  if (leaks.length === 0) {
    console.log(`[makage] check-publish: ${target} OK — no workspace: protocols found`);
    return;
  }

  const versions = strict ? new Map<string, string>() : await readWorkspaceVersions(process.cwd());
  const resolved = leaks.map((leak) => ({
    ...leak,
    resolvedVersion: resolveWorkspaceSpec(leak.value, versions.get(leak.name)),
  }));
  const unresolved = resolved.filter((leak) => !leak.resolvedVersion);

  if (unresolved.length === 0) {
    console.log(
      `[makage] check-publish: ${target} OK — ${resolved.length} workspace: protocol(s) resolvable at publish time`
    );
    for (const leak of resolved) {
      console.log(`  ${leak.field} -> "${leak.name}": "${leak.value}" => "${leak.resolvedVersion}"`);
    }
    return;
  }

  console.error(
    `[makage] check-publish: found ${unresolved.length} unresolvable workspace: protocol(s) in ${target}\n`
  );
  for (const leak of unresolved) {
    console.error(`  ${leak.field} -> "${leak.name}": "${leak.value}"`);
  }
  console.error(
    '\nThese will break npm/yarn consumers: no workspace package provides them, so the publish step'
    + '\ncannot substitute a real version. Replace them with real version ranges.'
  );
  process.exit(1);
}

export function findWorkspaceLeaks(pkg: Record<string, any>): WorkspaceLeak[] {
  const leaks: WorkspaceLeak[] = [];

  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') continue;

    for (const [name, value] of Object.entries(deps)) {
      if (typeof value === 'string' && value.startsWith('workspace:')) {
        leaks.push({ field, name, value });
      }
    }
  }

  return leaks;
}

/**
 * Version a `workspace:` spec becomes once pnpm/lerna publishes the package, or
 * undefined when nothing in the workspace can satisfy it.
 */
export function resolveWorkspaceSpec(spec: string, workspaceVersion?: string): string | undefined {
  const range = spec.slice('workspace:'.length);

  if (range === '' || range === '*') return workspaceVersion;
  if (range === '^' || range === '~') {
    return workspaceVersion ? `${range}${workspaceVersion}` : undefined;
  }

  // an explicit range (workspace:^1.2.3) is published verbatim
  return range;
}

async function readWorkspaceVersions(from: string): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  const root = await findWorkspaceRoot(from);
  if (!root) return versions;

  let patterns: string[];
  try {
    const raw = await fs.readFile(path.join(root, WORKSPACE_FILE), 'utf8');
    patterns = parseYaml(raw)?.packages ?? [];
  } catch {
    return versions;
  }

  const files = await findWorkspacePackageFiles(root, patterns);

  for (const file of files) {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
      if (manifest.name && manifest.version) versions.set(manifest.name, manifest.version);
    } catch {}
  }

  return versions;
}
