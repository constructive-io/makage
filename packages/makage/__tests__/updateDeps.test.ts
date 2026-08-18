import fs from 'node:fs/promises';

import { glob } from 'glob';

import { runUpdateDeps } from '../src/commands/updateDeps';

jest.mock('node:fs/promises');
jest.mock('glob');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

// Helpers to build package.json strings
function makePkg(name: string, version: string, deps?: Record<string, string>, devDeps?: Record<string, string>) {
  const pkg: Record<string, unknown> = { name, version };
  if (deps) pkg.dependencies = deps;
  if (devDeps) pkg.devDependencies = devDeps;
  return JSON.stringify(pkg);
}

const WORKSPACE_YAML = `packages:\n  - 'packages/*'\n  - 'graphile/*'\n`;

describe('runUpdateDeps', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should throw if --from is missing', async () => {
    await expect(runUpdateDeps(['--in', '/target'])).rejects.toThrow('Missing required argument: --from');
  });

  it('should throw if --in is missing', async () => {
    await expect(runUpdateDeps(['--from', '/source'])).rejects.toThrow('Missing required argument: --in');
  });

  it('should discover source packages and match against target', async () => {
    // Source workspace
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        return `packages:\n  - 'application/*'\n`;
      }
      // Source packages
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '2.0.0');
      }
      if (p.includes('source') && p.includes('graphile/bar/package.json')) {
        return makePkg('graphile-bar', '1.5.0');
      }
      // Target packages
      if (p.includes('target') && p.includes('package.json') && p.includes('application/myapp')) {
        return makePkg('myapp', '1.0.0', {
          '@scope/foo': '^1.0.0',
          'graphile-bar': '^1.5.0',
          'unrelated-pkg': '^3.0.0'
        });
      }
      if (p.includes('target') && p.endsWith('package.json') && !p.includes('application')) {
        return makePkg('target-root', '1.0.0', {
          'graphile-bar': '^1.3.0'
        });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json', 'graphile/bar/package.json'];
      }
      if (cwd.includes('target')) {
        return ['application/myapp/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

    // Should find 2 source packages
    expect(result.sourcePackages).toHaveLength(2);
    expect(result.sourcePackages.map(p => p.name).sort()).toEqual(['@scope/foo', 'graphile-bar']);

    // Should match 3 deps (foo in myapp, bar in myapp, bar in root)
    expect(result.matchedPackages).toHaveLength(3);
    const matchedNames = result.matchedPackages.map(p => p.name);
    expect(matchedNames).toContain('@scope/foo');
    expect(matchedNames).toContain('graphile-bar');

    // @scope/foo ^1.0.0 -> 2.0.0 is outdated
    const fooMatch = result.matchedPackages.find(p => p.name === '@scope/foo');
    expect(fooMatch?.outdated).toBe(true);
    expect(fooMatch?.currentVersion).toBe('^1.0.0');
    expect(fooMatch?.availableVersion).toBe('2.0.0');

    // graphile-bar ^1.5.0 -> 1.5.0 is NOT outdated (same version)
    const barMatchApp = result.matchedPackages.find(p => p.name === 'graphile-bar' && p.consumer === 'myapp');
    expect(barMatchApp?.outdated).toBe(false);

    // graphile-bar ^1.3.0 -> 1.5.0 IS outdated
    const barMatchRoot = result.matchedPackages.find(p => p.name === 'graphile-bar' && p.consumer === 'target-root');
    expect(barMatchRoot?.outdated).toBe(true);

    // Overall: has changes
    expect(result.has_dep_changes).toBe(true);
    expect(result.outdatedPackages).toHaveLength(2);

    // JSON output was written to stdout
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.has_dep_changes).toBe(true);
  });

  it('should report no changes when all deps are up to date', async () => {
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        throw new Error('ENOENT');
      }
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '2.0.0');
      }
      // Target root package.json
      if (p.includes('target') && p.endsWith('package.json')) {
        return makePkg('target', '1.0.0', { '@scope/foo': '^2.0.0' });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

    expect(result.matchedPackages).toHaveLength(1);
    expect(result.outdatedPackages).toHaveLength(0);
    expect(result.has_dep_changes).toBe(false);
  });

  it('should scan all package.json files in non-workspace target repos', async () => {
    // Source workspace has one package
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('boilerplate')) {
        throw new Error('ENOENT');
      }
      // Source package
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '3.0.0');
      }
      // Boilerplate target — multiple independent package.json files, no workspace
      if (p.includes('boilerplate') && p.includes('graphql/codegen/package.json')) {
        return makePkg('codegen-template', '0.0.1', { '@scope/foo': '^2.0.0' });
      }
      if (p.includes('boilerplate') && p.includes('nextjs/app/package.json')) {
        return makePkg('nextjs-template', '0.0.1', {}, { '@scope/foo': '^3.0.0' });
      }
      if (p.includes('boilerplate') && p.endsWith('package.json') && !p.includes('graphql') && !p.includes('nextjs')) {
        return makePkg('boilerplate-root', '1.0.0');
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json'];
      }
      // Non-workspace target — glob returns all nested package.json files
      if (cwd.includes('boilerplate')) {
        return ['package.json', 'graphql/codegen/package.json', 'nextjs/app/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/boilerplate']);

    // Should find the source package
    expect(result.sourcePackages).toHaveLength(1);
    expect(result.sourcePackages[0].name).toBe('@scope/foo');

    // Should match deps in both nested templates (not root — root has no matching deps)
    expect(result.matchedPackages).toHaveLength(2);

    // codegen-template has @scope/foo ^2.0.0 -> 3.0.0 (outdated)
    const codegenMatch = result.matchedPackages.find(p => p.consumer === 'codegen-template');
    expect(codegenMatch?.outdated).toBe(true);
    expect(codegenMatch?.depType).toBe('dependencies');

    // nextjs-template has @scope/foo ^3.0.0 -> 3.0.0 (up to date)
    const nextjsMatch = result.matchedPackages.find(p => p.consumer === 'nextjs-template');
    expect(nextjsMatch?.outdated).toBe(false);
    expect(nextjsMatch?.depType).toBe('devDependencies');

    expect(result.has_dep_changes).toBe(true);
    expect(result.outdatedPackages).toHaveLength(1);
  });

  it('should handle workspace: protocol as not outdated', async () => {
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        throw new Error('ENOENT');
      }
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '5.0.0');
      }
      if (p.includes('target') && p.endsWith('package.json')) {
        return makePkg('target', '1.0.0', { '@scope/foo': 'workspace:*' });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

    expect(result.matchedPackages).toHaveLength(1);
    expect(result.matchedPackages[0].outdated).toBe(false);
    expect(result.has_dep_changes).toBe(false);
    expect(result.updatedFiles).toHaveLength(0);
    expect(mockedFs.writeFile).not.toHaveBeenCalled();
  });

  it('should write updated package.json files by default, preserving version prefixes', async () => {
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        throw new Error('ENOENT');
      }
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '2.0.0');
      }
      if (p.includes('source') && p.includes('graphile/bar/package.json')) {
        return makePkg('graphile-bar', '1.5.0');
      }
      if (p.includes('target') && p.endsWith('package.json')) {
        return JSON.stringify(
          {
            name: 'target',
            version: '1.0.0',
            dependencies: { '@scope/foo': '^1.0.0', 'graphile-bar': '~1.5.0' }
          },
          null,
          2
        ) + '\n';
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json', 'graphile/bar/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

    expect(result.dry_run).toBe(false);
    expect(result.updatedFiles).toEqual(['package.json']);
    expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);

    const written = mockedFs.writeFile.mock.calls[0][1] as string;
    const writtenPkg = JSON.parse(written);
    // outdated dep bumped, prefix preserved
    expect(writtenPkg.dependencies['@scope/foo']).toBe('^2.0.0');
    // up-to-date dep untouched
    expect(writtenPkg.dependencies['graphile-bar']).toBe('~1.5.0');
    // formatting preserved (2-space indent + trailing newline)
    expect(written.endsWith('\n')).toBe(true);
    expect(written).toContain('  "name"');
  });

  it('should not write files with --dry-run', async () => {
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return WORKSPACE_YAML;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        throw new Error('ENOENT');
      }
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '2.0.0');
      }
      if (p.includes('target') && p.endsWith('package.json')) {
        return makePkg('target', '1.0.0', { '@scope/foo': '^1.0.0' });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        return ['packages/foo/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target', '--dry-run']);

    expect(result.dry_run).toBe(true);
    expect(result.has_dep_changes).toBe(true);
    expect(result.outdatedPackages).toHaveLength(1);
    expect(result.updatedFiles).toHaveLength(0);
    expect(mockedFs.writeFile).not.toHaveBeenCalled();
  });

  describe('pnpm catalogs', () => {
    const TARGET_WORKSPACE_YAML = `packages:
  - 'packages/*'

# one version per dependency, declared here
catalog:
  '@scope/foo': ^2.0.0

catalogs:
  legacy:
    graphile-bar: ^1.0.0
`;

    function mockCatalogTarget(manifests: Record<string, string>) {
      mockedFs.readFile.mockImplementation(async (filePath: any) => {
        const p = filePath.toString();
        if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
          return WORKSPACE_YAML;
        }
        if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
          return TARGET_WORKSPACE_YAML;
        }
        if (p.includes('source') && p.includes('packages/foo/package.json')) {
          return makePkg('@scope/foo', '3.0.0');
        }
        if (p.includes('source') && p.includes('graphile/bar/package.json')) {
          return makePkg('graphile-bar', '2.0.0');
        }
        for (const [file, contents] of Object.entries(manifests)) {
          if (p.endsWith(`target/${file}`)) return contents;
        }
        throw new Error(`ENOENT: ${p}`);
      });

      mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
        const cwd = opts?.cwd || '';
        if (cwd.includes('source')) {
          return ['packages/foo/package.json', 'graphile/bar/package.json'];
        }
        return Object.keys(manifests).filter(f => f !== 'package.json');
      });
    }

    const writtenFile = (suffix: string) =>
      mockedFs.writeFile.mock.calls.find(call => call[0].toString().endsWith(suffix))?.[1] as string | undefined;

    it('bumps the catalog entry in pnpm-workspace.yaml, once, for all consumers', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { '@scope/foo': 'catalog:' }),
        'packages/two/package.json': makePkg('two', '1.0.0', { '@scope/foo': 'catalog:default' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

      // deduped: one report for the catalog entry, not one per consumer
      const fooMatches = result.matchedPackages.filter(p => p.name === '@scope/foo');
      expect(fooMatches).toHaveLength(1);
      expect(fooMatches[0]).toMatchObject({
        currentVersion: '^2.0.0',
        availableVersion: '3.0.0',
        outdated: true,
        catalog: 'default',
        file: 'pnpm-workspace.yaml'
      });

      expect(result.updatedFiles).toEqual(['pnpm-workspace.yaml']);
      const yaml = writtenFile('pnpm-workspace.yaml') as string;
      expect(yaml).toContain(`'@scope/foo': ^3.0.0`);
      expect(yaml).toContain('# one version per dependency, declared here');
      // consuming manifests are untouched
      expect(writtenFile('packages/one/package.json')).toBeUndefined();
      expect(writtenFile('packages/two/package.json')).toBeUndefined();
    });

    it('bumps named catalog entries', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { 'graphile-bar': 'catalog:legacy' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

      const barMatch = result.matchedPackages.find(p => p.name === 'graphile-bar');
      expect(barMatch).toMatchObject({ currentVersion: '^1.0.0', catalog: 'legacy', outdated: true });

      const yaml = writtenFile('pnpm-workspace.yaml') as string;
      expect(yaml).toContain('  legacy:\n    graphile-bar: ^2.0.0\n');
    });

    it('bumps a manifest-level override in place, leaving the catalog entry alone', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { '@scope/foo': '^2.5.0' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

      const fooMatch = result.matchedPackages.find(p => p.name === '@scope/foo');
      expect(fooMatch).toMatchObject({ consumer: 'one', currentVersion: '^2.5.0', outdated: true });
      expect(fooMatch?.catalog).toBeUndefined();

      expect(result.updatedFiles).toEqual(['packages/one/package.json']);
      expect(JSON.parse(writtenFile('packages/one/package.json') as string).dependencies['@scope/foo']).toBe('^3.0.0');
      expect(writtenFile('pnpm-workspace.yaml')).toBeUndefined();
    });

    it('still skips workspace: specs on cataloged deps', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { '@scope/foo': 'workspace:^' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

      expect(result.matchedPackages).toHaveLength(1);
      expect(result.matchedPackages[0]).toMatchObject({ currentVersion: 'workspace:^', outdated: false });
      expect(result.has_dep_changes).toBe(false);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('does not write pnpm-workspace.yaml with --dry-run', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { '@scope/foo': 'catalog:' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target', '--dry-run']);

      expect(result.has_dep_changes).toBe(true);
      expect(result.updatedFiles).toHaveLength(0);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('warns instead of silently skipping when a catalog entry is missing', async () => {
      mockCatalogTarget({
        'package.json': makePkg('target-root', '1.0.0'),
        'packages/one/package.json': makePkg('one', '1.0.0', { 'graphile-bar': 'catalog:' })
      });

      const result = await runUpdateDeps(['--from', '/source', '--in', '/target']);

      expect(result.matchedPackages).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('graphile-bar');
      expect(result.warnings[0]).toContain('catalog');
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });

  it('should pick the highest version when source workspace contains duplicate package names', async () => {
    mockedFs.readFile.mockImplementation(async (filePath: any) => {
      const p = filePath.toString();
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('source')) {
        return `packages:\n  - 'packages/*'\n  - 'packages/*/versions/*'\n`;
      }
      if (p.endsWith('pnpm-workspace.yaml') && p.includes('target')) {
        throw new Error('ENOENT');
      }
      if (p.includes('source') && p.includes('packages/foo/package.json')) {
        return makePkg('@scope/foo', '2.0.0');
      }
      if (p.includes('source') && p.includes('packages/foo/versions/1/package.json')) {
        return makePkg('@scope/foo', '1.9.0');
      }
      if (p.includes('target') && p.endsWith('package.json')) {
        return makePkg('target', '1.0.0', { '@scope/foo': '^1.0.0' });
      }
      throw new Error(`ENOENT: ${p}`);
    });

    mockedGlob.mockImplementation(async (patterns: any, opts: any) => {
      const cwd = opts?.cwd || '';
      if (cwd.includes('source')) {
        // Deliberately return the lower version last, which previously would
        // overwrite the sourceMap and produce availableVersion: 1.9.0.
        return ['packages/foo/package.json', 'packages/foo/versions/1/package.json'];
      }
      return [];
    });

    const result = await runUpdateDeps(['--from', '/source', '--in', '/target', '--dry-run']);

    const fooMatch = result.matchedPackages.find(p => p.name === '@scope/foo');
    expect(fooMatch?.availableVersion).toBe('2.0.0');
    expect(fooMatch?.outdated).toBe(true);
    expect(result.has_dep_changes).toBe(true);
  });
});
