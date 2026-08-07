import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runDeps } from '../src/commands/deps';

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

async function makeWorkspace(root: string, packages: { dir: string; name: string; version: string }[]) {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
  for (const pkg of packages) {
    await writeJson(path.join(root, 'packages', pkg.dir, 'package.json'), { name: pkg.name, version: pkg.version });
  }
}

describe('runDeps', () => {
  let parent: string;
  let target: string;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    parent = await fs.mkdtemp(path.join(os.tmpdir(), 'makage-deps-'));
    target = path.join(parent, 'constructive-db');

    await makeWorkspace(path.join(parent, 'constructive'), [
      { dir: 'cli', name: '@constructive/cli', version: '2.1.0' }
    ]);
    await makeWorkspace(path.join(parent, 'pgsql-parser'), [
      { dir: 'parser', name: 'pgsql-parser', version: '17.5.0' }
    ]);

    await makeWorkspace(target, []);
    await writeJson(path.join(target, 'package.json'), {
      name: 'constructive-db',
      version: '0.0.1',
      dependencies: { '@constructive/cli': '^2.0.0', 'pgsql-parser': '^17.0.0' }
    });

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await fs.rm(parent, { recursive: true, force: true });
  });

  async function readTargetDeps() {
    const content = await fs.readFile(path.join(target, 'package.json'), 'utf-8');
    return JSON.parse(content).dependencies as Record<string, string>;
  }

  it('resolves a bare name as a sibling directory and updates deps', async () => {
    const result = await runDeps(['constructive', '--in', target]);

    expect(result).toBeDefined();
    expect(result.has_dep_changes).toBe(true);
    expect(result.siblings[0].outdated).toEqual([
      { name: '@constructive/cli', from: '^2.0.0', to: '2.1.0', consumer: 'constructive-db' }
    ]);
    expect(await readTargetDeps()).toEqual({ '@constructive/cli': '^2.1.0', 'pgsql-parser': '^17.0.0' });
  });

  it('updates from every sibling workspace with --all', async () => {
    const result = await runDeps(['--all', '--in', target]);

    expect(result.siblings.map(s => s.name).sort()).toEqual(['constructive', 'pgsql-parser']);
    expect(await readTargetDeps()).toEqual({ '@constructive/cli': '^2.1.0', 'pgsql-parser': '^17.5.0' });
  });

  it('writes nothing with --dry-run', async () => {
    const result = await runDeps(['constructive', '--in', target, '--dry-run']);

    expect(result.has_dep_changes).toBe(true);
    expect(result.siblings[0].updatedFiles).toEqual([]);
    expect(await readTargetDeps()).toEqual({ '@constructive/cli': '^2.0.0', 'pgsql-parser': '^17.0.0' });
  });

  it('accepts an explicit relative path', async () => {
    const result = await runDeps([path.join(parent, 'pgsql-parser'), '--in', target]);

    expect(result.siblings[0].outdated).toHaveLength(1);
  });

  it('throws when the sibling is not a pnpm workspace', async () => {
    await expect(runDeps(['nope', '--in', target])).rejects.toThrow('expected a sibling repo named "nope"');
  });

  it('throws when no sibling is given', async () => {
    await expect(runDeps(['--in', target])).rejects.toThrow('No sibling repos given');
  });

  it('lists sibling workspaces', async () => {
    await runDeps(['--list', '--in', target]);

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('constructive');
    expect(output).toContain('pgsql-parser');
  });
});
