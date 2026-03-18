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
  });
});
