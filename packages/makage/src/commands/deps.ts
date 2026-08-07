import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { updateDeps, UpdateDepsResult } from './updateDeps';
import { findWorkspaceRoot } from './workspace';

interface DepsOptions {
  names: string[];
  all: boolean;
  list: boolean;
  dryRun: boolean;
  install: boolean;
  json: boolean;
  root: string;
}

export interface SiblingResult {
  name: string;
  path: string;
  outdated: { name: string; from: string; to: string; consumer: string }[];
  updatedFiles: string[];
}

export interface DepsResult {
  target: string;
  siblings: SiblingResult[];
  dry_run: boolean;
  has_dep_changes: boolean;
}

function parseArgs(args: string[]): DepsOptions {
  const names: string[] = [];
  let all = false;
  let list = false;
  let dryRun = false;
  let install = false;
  let json = false;
  let root = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') all = true;
    else if (arg === '--list') list = true;
    else if (arg === '--dry-run' || arg === '--check') dryRun = true;
    else if (arg === '--install') install = true;
    else if (arg === '--json') json = true;
    else if (arg === '--in' && args[i + 1]) root = args[++i];
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else names.push(arg);
  }

  return { names, all, list, dryRun, install, json, root };
}

async function isWorkspace(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, 'pnpm-workspace.yaml'));
    return true;
  } catch {
    return false;
  }
}

async function findSiblings(targetRoot: string): Promise<string[]> {
  const parent = path.dirname(targetRoot);
  const entries = await fs.readdir(parent, { withFileTypes: true });
  const siblings: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(parent, entry.name);
    if (dir === targetRoot) continue;
    if (await isWorkspace(dir)) siblings.push(entry.name);
  }

  return siblings.sort();
}

function resolveSibling(name: string, targetRoot: string): string {
  if (path.isAbsolute(name) || name.startsWith('.') || name.includes('/') || name.includes(path.sep)) {
    return path.resolve(name);
  }
  return path.join(path.dirname(targetRoot), name);
}

function runPnpmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm install exited with code ${code}`));
    });
  });
}

function summarize(name: string, dir: string, result: UpdateDepsResult): SiblingResult {
  return {
    name,
    path: dir,
    outdated: result.outdatedPackages.map(dep => ({
      name: dep.name,
      from: dep.currentVersion,
      to: dep.availableVersion,
      consumer: dep.consumer
    })),
    updatedFiles: result.updatedFiles
  };
}

export async function runDeps(args: string[]): Promise<DepsResult> {
  const opts = parseArgs(args);

  const targetRoot = opts.root
    ? path.resolve(opts.root)
    : (await findWorkspaceRoot(process.cwd())) ?? process.cwd();

  if (opts.list) {
    const found = await findSiblings(targetRoot);
    if (found.length === 0) {
      console.log(`[makage] No sibling workspaces found next to ${targetRoot}`);
    } else {
      console.log(`[makage] Sibling workspaces of ${path.basename(targetRoot)}:`);
      for (const sibling of found) console.log(`  ${sibling}`);
    }
    return { target: targetRoot, siblings: [], dry_run: opts.dryRun, has_dep_changes: false };
  }

  let names = opts.names;
  if (opts.all) {
    names = [...new Set([...names, ...(await findSiblings(targetRoot))])];
  }

  if (names.length === 0) {
    throw new Error(
      'No sibling repos given. Usage: makage deps <repo...> [--all] [--dry-run] [--install] (see `makage deps --list`)'
    );
  }

  const siblings: SiblingResult[] = [];

  for (const name of names) {
    const dir = resolveSibling(name, targetRoot);

    if (!(await isWorkspace(dir))) {
      throw new Error(`No pnpm workspace at ${dir} — expected a sibling repo named "${name}"`);
    }

    console.error(`\n[makage] deps <- ${name} (${dir})`);
    const result = await updateDeps({ from: dir, in: targetRoot, dryRun: opts.dryRun });
    const summary = summarize(name, dir, result);

    for (const dep of summary.outdated) {
      console.error(`  ${dep.consumer}: ${dep.name} ${dep.from} -> ${dep.to}`);
    }

    siblings.push(summary);
  }

  const hasChanges = siblings.some(s => s.outdated.length > 0);

  if (opts.json) {
    console.log(JSON.stringify({ target: targetRoot, siblings, dry_run: opts.dryRun, has_dep_changes: hasChanges }, null, 2));
  } else if (!hasChanges) {
    console.error('\n[makage] Everything is up to date');
  } else if (opts.dryRun) {
    console.error('\n[makage] Dry run — no files written');
  }

  if (opts.install && hasChanges && !opts.dryRun) {
    console.error('\n[makage] Running pnpm install...');
    await runPnpmInstall(targetRoot);
  }

  return { target: targetRoot, siblings, dry_run: opts.dryRun, has_dep_changes: hasChanges };
}
