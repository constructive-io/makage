/**
 * Integration test for the new merging behavior
 * Tests end-to-end functionality with the builder
 */

import { createJsonLdBuilder, createJsonLdConfig } from '../../src';

const testGraph = [
  {
    '@id': 'org:hyperweb',
    '@type': 'Organization',
    name: 'Hyperweb',
    url: 'https://hyperweb.io',
  },
  {
    '@id': 'person:john',
    '@type': 'Person',
    name: 'John Doe',
    worksFor: { '@id': 'org:hyperweb' },
  },
  {
    '@id': 'article:1',
    '@type': 'Article',
    name: 'Test Article',
    author: { '@id': 'person:john' },
  },
  {
    '@id': 'image:1',
    '@type': 'ImageObject',
    name: 'Test Image',
  },
];

describe('Integration: Merging Behavior with Builder', () => {
  test('merging behavior works with full builder pipeline', () => {
    const result = createJsonLdBuilder()
      .baseGraph(testGraph)
      .includeTypes(['Person'])
      .includeTypes(['Organization'])
      .excludeIds(['image:1'])
      .excludeIds(['article:1'])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);

    const ids = parsed['@graph'].map((entity: any) => entity['@id']);
    expect(ids).toContain('org:hyperweb');
    expect(ids).toContain('person:john');
    expect(ids).not.toContain('image:1');
    expect(ids).not.toContain('article:1');
  });

  test('clear methods work with builder pipeline', () => {
    const result = createJsonLdBuilder()
      .baseGraph(testGraph)
      .includeTypes(['Person', 'Organization'])
      .excludeIds(['person:john'])
      .clearIds() // Clear the exclude
      .includeIds(['person:john', 'org:hyperweb'])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);

    const ids = parsed['@graph'].map((entity: any) => entity['@id']);
    expect(ids).toContain('org:hyperweb');
    expect(ids).toContain('person:john');
  });

  test('configuration reuse with merging behavior', () => {
    // Create base config with merging
    const baseConfig = createJsonLdConfig()
      .baseGraph(testGraph)
      .includeTypes(['Person'])
      .includeTypes(['Organization']);

    // Extend config
    const extendedConfig = baseConfig
      .excludeTypes(['ImageObject'])
      .excludeTypes(['Article'])
      .getConfig();

    const result = createJsonLdBuilder().mergeConfig(extendedConfig).build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);

    const types = parsed['@graph'].map((entity: any) => entity['@type']);
    expect(types).toContain('Person');
    expect(types).toContain('Organization');
    expect(types).not.toContain('ImageObject');
    expect(types).not.toContain('Article');
  });

  test('clear methods work with configuration reuse', () => {
    const baseConfig = createJsonLdConfig()
      .baseGraph(testGraph)
      .includeTypes(['Person', 'Organization', 'Article']);

    const clearedConfig = baseConfig.clearTypes().includeTypes(['Person']).getConfig();

    const result = createJsonLdBuilder().mergeConfig(clearedConfig).build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(1);
    expect(parsed['@graph'][0]['@type']).toBe('Person');
  });

  test('runtime overrides with merging behavior', () => {
    const config = createJsonLdConfig().baseGraph(testGraph).includeTypes(['Person']).getConfig();

    const result = createJsonLdBuilder()
      .mergeConfig(config)
      .includeTypes(['Organization']) // Runtime merge
      .excludeIds(['article:1', 'image:1']) // Runtime exclude
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);

    const types = parsed['@graph'].map((entity: any) => entity['@type']);
    expect(types).toContain('Person');
    expect(types).toContain('Organization');
  });

  test('complex chaining with clear methods', () => {
    const result = createJsonLdBuilder()
      .baseGraph(testGraph)
      .includeTypes(['Person', 'Organization', 'Article'])
      .excludeIds(['person:john'])
      .clearTypes()
      .includeTypes(['Person'])
      .clearIds()
      .includeIds(['person:john'])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(1);
    expect(parsed['@graph'][0]['@id']).toBe('person:john');
    expect(parsed['@graph'][0]['@type']).toBe('Person');
  });
});
