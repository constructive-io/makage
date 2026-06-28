import fs from 'node:fs/promises';
import path from 'node:path';

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

export async function runCheckPublish(args: string[]) {
  const target = args[0] || path.join('dist', 'package.json');

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

  console.error(`[makage] check-publish: found ${leaks.length} workspace: protocol(s) in ${target}\n`);
  for (const leak of leaks) {
    console.error(`  ${leak.field} -> "${leak.name}": "${leak.value}"`);
  }
  console.error(
    '\nThese will break npm/yarn consumers. Replace workspace: with real version ranges in peerDependencies,'
    + '\nor ensure your publish tool resolves them (pnpm publish handles dependencies but not always peerDependencies).'
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
