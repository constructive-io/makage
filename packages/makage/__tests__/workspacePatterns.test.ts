import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { findWorkspacePackageFiles, packagePatternToGlob } from '../src/commands/workspacePatterns';

describe('packagePatternToGlob', () => {
  it('appends package.json, keeping glob segments wherever they appear', () => {
    expect(packagePatternToGlob('packages/*')).toBe('packages/*/package.json');
    expect(packagePatternToGlob('functions/*/handlers/*')).toBe('functions/*/handlers/*/package.json');
    expect(packagePatternToGlob('functions/*/pages')).toBe('functions/*/pages/package.json');
    expect(packagePatternToGlob('packages/**')).toBe('packages/**/package.json');
    expect(packagePatternToGlob('apps/web')).toBe('apps/web/package.json');
  });

  it('normalizes the root and trailing slashes', () => {
    expect(packagePatternToGlob('.')).toBe('package.json');
    expect(packagePatternToGlob('packages/')).toBe('packages/package.json');
    expect(packagePatternToGlob('**')).toBe('**/package.json');
  });
});

describe('findWorkspacePackageFiles', () => {
  let root: string;

  const write = async (relPath: string, contents: string) => {
    const target = path.join(root, relPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
  };

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'makage-patterns-'));
    await write('packages/a/package.json', '{"name":"a"}');
    await write('functions/api/handlers/hello/package.json', '{"name":"hello"}');
    await write('functions/api/pages/package.json', '{"name":"pages"}');
    await write('scratch/nope/package.json', '{"name":"nope"}');
    await write('packages/a/node_modules/dep/package.json', '{"name":"dep"}');
  });

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('expands patterns with interior * segments', async () => {
    const files = await findWorkspacePackageFiles(root, ['packages/*', 'functions/*/handlers/*', 'functions/*/pages']);

    expect(files.sort()).toEqual([
      'functions/api/handlers/hello/package.json',
      'functions/api/pages/package.json',
      'packages/a/package.json'
    ]);
  });

  it('ignores node_modules', async () => {
    const files = await findWorkspacePackageFiles(root, ['packages/**']);
    expect(files).toEqual(['packages/a/package.json']);
  });

  it('honours ! exclusions', async () => {
    const files = await findWorkspacePackageFiles(root, ['**', '!scratch/*', '!functions/*/handlers/*']);

    expect(files.sort()).toEqual([
      'functions/api/pages/package.json',
      'packages/a/package.json'
    ]);
  });

  it('returns nothing when there is nothing to include', async () => {
    expect(await findWorkspacePackageFiles(root, ['!packages/*'])).toEqual([]);
  });
});
