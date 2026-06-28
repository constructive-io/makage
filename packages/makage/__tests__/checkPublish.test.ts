import fs from 'node:fs/promises';
import { findWorkspaceLeaks } from '../src/commands/checkPublish';

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
