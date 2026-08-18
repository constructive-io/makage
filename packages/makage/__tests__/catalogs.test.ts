import { DEFAULT_CATALOG, getCatalogSpec, parseCatalogSpec, readCatalogs, setCatalogSpec } from '../src/commands/catalogs';

const WORKSPACE_YAML = `packages:
  - 'packages/*'

# Every external dependency is declared exactly once, here.
catalog:
  # pinned on purpose — 5.7 breaks the codegen
  typescript: ^5.6.3
  react: "^18.2.0"

catalogs:
  react18:
    react: ^18.3.1
  react19:
    react: ^19.0.0

# trailing comment
`;

describe('parseCatalogSpec', () => {
  it('maps catalog: and catalog:default to the default catalog', () => {
    expect(parseCatalogSpec('catalog:')).toBe(DEFAULT_CATALOG);
    expect(parseCatalogSpec('catalog:default')).toBe(DEFAULT_CATALOG);
  });

  it('reads named catalogs', () => {
    expect(parseCatalogSpec('catalog:react18')).toBe('react18');
  });

  it('ignores non-catalog specs', () => {
    expect(parseCatalogSpec('^1.0.0')).toBeNull();
    expect(parseCatalogSpec('workspace:*')).toBeNull();
    expect(parseCatalogSpec('npm:react@18')).toBeNull();
  });
});

describe('readCatalogs', () => {
  it('reads the default and named catalogs', () => {
    const catalogs = readCatalogs(WORKSPACE_YAML);

    expect(getCatalogSpec(catalogs, DEFAULT_CATALOG, 'typescript')).toBe('^5.6.3');
    expect(getCatalogSpec(catalogs, DEFAULT_CATALOG, 'react')).toBe('^18.2.0');
    expect(getCatalogSpec(catalogs, 'react18', 'react')).toBe('^18.3.1');
    expect(getCatalogSpec(catalogs, 'react19', 'react')).toBe('^19.0.0');
    expect(getCatalogSpec(catalogs, DEFAULT_CATALOG, 'missing')).toBeUndefined();
    expect(getCatalogSpec(catalogs, 'nope', 'react')).toBeUndefined();
  });

  it('treats catalogs.default as the default catalog, with catalog winning', () => {
    const catalogs = readCatalogs(`catalog:\n  react: ^18.2.0\ncatalogs:\n  default:\n    react: ^17.0.0\n    vue: ^3.0.0\n`);

    expect(getCatalogSpec(catalogs, DEFAULT_CATALOG, 'react')).toBe('^18.2.0');
    expect(getCatalogSpec(catalogs, DEFAULT_CATALOG, 'vue')).toBe('^3.0.0');
  });

  it('returns an empty map for a workspace without catalogs', () => {
    expect(readCatalogs(`packages:\n  - 'packages/*'\n`).size).toBe(0);
  });
});

describe('setCatalogSpec', () => {
  it('rewrites a default catalog entry and leaves every other byte alone', () => {
    const updated = setCatalogSpec(WORKSPACE_YAML, DEFAULT_CATALOG, 'typescript', '^5.9.3');

    expect(updated).not.toBeNull();
    expect(updated).toContain('  typescript: ^5.9.3\n');
    expect(updated).toContain('# pinned on purpose — 5.7 breaks the codegen');
    expect(updated).toContain('# Every external dependency is declared exactly once, here.');
    expect(updated).toContain('# trailing comment');
    // only the one line changed
    const before = WORKSPACE_YAML.split('\n');
    const after = (updated as string).split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toEqual(['  typescript: ^5.9.3']);
  });

  it('preserves the quoting style of the entry it rewrites', () => {
    const updated = setCatalogSpec(WORKSPACE_YAML, DEFAULT_CATALOG, 'react', '^18.3.1');
    expect(updated).toContain('  react: "^18.3.1"');
  });

  it('rewrites a named catalog entry without touching the same dep in other catalogs', () => {
    const updated = setCatalogSpec(WORKSPACE_YAML, 'react18', 'react', '^18.3.2') as string;

    expect(updated).toContain('  react18:\n    react: ^18.3.2\n');
    expect(updated).toContain('  react19:\n    react: ^19.0.0\n');
    expect(updated).toContain('  react: "^18.2.0"');
  });

  it('returns null when the entry does not exist', () => {
    expect(setCatalogSpec(WORKSPACE_YAML, DEFAULT_CATALOG, 'nope', '^1.0.0')).toBeNull();
    expect(setCatalogSpec(WORKSPACE_YAML, 'react20', 'react', '^20.0.0')).toBeNull();
  });

  it('keeps a trailing comment on the entry line', () => {
    const yaml = `catalog:\n  typescript: ^5.6.3 # do not bump past 5.6 lightly\n`;
    expect(setCatalogSpec(yaml, DEFAULT_CATALOG, 'typescript', '^5.9.3')).toBe(
      `catalog:\n  typescript: ^5.9.3 # do not bump past 5.6 lightly\n`
    );
  });

  it('falls back to a document edit for flow-style catalogs', () => {
    const yaml = `catalog: { typescript: ^5.6.3 }\n`;
    const updated = setCatalogSpec(yaml, DEFAULT_CATALOG, 'typescript', '^5.9.3') as string;
    expect(updated).toContain('^5.9.3');
    expect(readCatalogs(updated).get(DEFAULT_CATALOG)).toEqual({ typescript: '^5.9.3' });
  });
});
