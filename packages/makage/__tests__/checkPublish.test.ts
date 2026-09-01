import fs from 'node:fs/promises';
import { findWorkspaceLeaks, resolveWorkspaceSpec } from '../src/commands/checkPublish';

describe('resolveWorkspaceSpec', () => {
  it('resolves star and bare specs to the workspace version', () => {
    expect(resolveWorkspaceSpec('workspace:*', '1.2.3')).toBe('1.2.3');
    expect(resolveWorkspaceSpec('workspace:', '1.2.3')).toBe('1.2.3');
  });

  it('keeps the range operator for caret and tilde specs', () => {
    expect(resolveWorkspaceSpec('workspace:^', '1.2.3')).toBe('^1.2.3');
    expect(resolveWorkspaceSpec('workspace:~', '1.2.3')).toBe('~1.2.3');
  });

  it('publishes explicit ranges verbatim', () => {
    expect(resolveWorkspaceSpec('workspace:^1.2.3')).toBe('^1.2.3');
  });

  it('is unresolvable when no workspace package provides the version', () => {
    expect(resolveWorkspaceSpec('workspace:*')).toBeUndefined();
    expect(resolveWorkspaceSpec('workspace:^')).toBeUndefined();
  });
});

describe('findWorkspaceLeaks', () => {
  it('should return empty array for clean package.json', () => {
    const pkg = {
      name: 'my-pkg',
      dependencies: {
        lodash: '^4.17.21',
        express: '^5.0.0',
      },
      peerDependencies: {
        react: '^18.0.0',
      },
    };

    expect(findWorkspaceLeaks(pkg)).toEqual([]);
  });

  it('should detect workspace: in dependencies', () => {
    const pkg = {
      dependencies: {
        lodash: '^4.17.21',
        'my-lib': 'workspace:^',
      },
    };

    expect(findWorkspaceLeaks(pkg)).toEqual([
      { field: 'dependencies', name: 'my-lib', value: 'workspace:^' },
    ]);
  });

  it('should detect workspace: in peerDependencies', () => {
    const pkg = {
      peerDependencies: {
        react: '^18.0.0',
        'my-plugin': 'workspace:^',
      },
    };

    expect(findWorkspaceLeaks(pkg)).toEqual([
      { field: 'peerDependencies', name: 'my-plugin', value: 'workspace:^' },
    ]);
  });

  it('should detect workspace:* variant', () => {
    const pkg = {
      dependencies: {
        'my-lib': 'workspace:*',
      },
    };

    expect(findWorkspaceLeaks(pkg)).toEqual([
      { field: 'dependencies', name: 'my-lib', value: 'workspace:*' },
    ]);
  });

  it('should detect leaks across multiple fields', () => {
    const pkg = {
      dependencies: {
        'lib-a': 'workspace:^',
      },
      peerDependencies: {
        'lib-b': 'workspace:^',
      },
      optionalDependencies: {
        'lib-c': 'workspace:*',
      },
    };

    const leaks = findWorkspaceLeaks(pkg);
    expect(leaks).toHaveLength(3);
    expect(leaks).toEqual([
      { field: 'dependencies', name: 'lib-a', value: 'workspace:^' },
      { field: 'peerDependencies', name: 'lib-b', value: 'workspace:^' },
      { field: 'optionalDependencies', name: 'lib-c', value: 'workspace:*' },
    ]);
  });

  it('should skip devDependencies (not published)', () => {
    const pkg = {
      devDependencies: {
        'my-tool': 'workspace:^',
      },
    };

    expect(findWorkspaceLeaks(pkg)).toEqual([]);
  });

  it('should handle missing dependency fields', () => {
    const pkg = { name: 'bare-pkg', version: '1.0.0' };
    expect(findWorkspaceLeaks(pkg)).toEqual([]);
  });
});
