/**
 * Comprehensive tests for JSON-LD Builder using fixture data
 *
 * Tests the core functionality of the configuration builder and main builder
 * using real fixture data and extensive snapshot testing
 */

import { createJsonLdBuilder, createJsonLdConfig } from '../../src';
import type { JsonLdEntity, JsonLdGraph } from '../../src';
import graph from '../../../../fixtures/graph.json';

describe('JsonLdConfigBuilder', () => {
  test('creates empty config', () => {
    const config = createJsonLdConfig().getConfig();
    expect(config).toMatchSnapshot();
  });

  test('builds configuration immutably', () => {
    const baseConfig = createJsonLdConfig().baseGraph(graph).includeIds(['org:hyperweb']);

    const extendedConfig = baseConfig.excludeTypes(['ImageObject']);

    // Original config should be unchanged
    expect(baseConfig.getConfig().filters?.excludeTypes).toBeUndefined();

    // Extended config should have both settings
    const extended = extendedConfig.getConfig();
    expect(extended.baseGraph).toBe(graph);
    expect(extended.filters?.includeIds).toEqual(['org:hyperweb']);
    expect(extended.filters?.excludeTypes).toEqual(['ImageObject']);
  });

  test('supports property filtering by IDs', () => {
    const config = createJsonLdConfig()
      .filterPropertiesByIds(['org:hyperweb'], { exclude: ['member'] })
      .getConfig();

    expect(config.filters?.propertyFiltersByIds).toMatchSnapshot();
  });

  test('supports property filtering by types', () => {
    const config = createJsonLdConfig()
      .filterPropertiesByTypes(['Article'], { include: ['headline', 'author'] })
      .getConfig();

    expect(config.filters?.propertyFiltersByTypes).toMatchSnapshot();
  });

  test('supports chaining multiple configurations', () => {
    const config = createJsonLdConfig()
      .baseGraph(graph)
      .includeIds(['org:hyperweb'])
      .excludeTypes(['ImageObject'])
      .maxEntities(10)
      .requiredProperties(['name'])
      .filterPropertiesByIds(['org:hyperweb'], { exclude: ['member'] })
      .getConfig();

    expect(config.baseGraph).toBe(graph);
    expect(config.filters?.includeIds).toEqual(['org:hyperweb']);
    expect(config.filters?.excludeTypes).toEqual(['ImageObject']);
    expect(config.filters?.maxEntities).toBe(10);
    expect(config.filters?.requiredProperties).toEqual(['name']);
    expect(config.filters?.propertyFiltersByIds).toHaveLength(1);
  });

  test('supports subgraph extraction configuration', () => {
    const config = createJsonLdConfig().baseGraph(graph).subgraph(['person:danlynch']).getConfig();

    expect(config.filters?.subgraphRoots).toMatchSnapshot();
  });

  test('supports adding additional entities', () => {
    const additionalEntity: JsonLdEntity = {
      '@id': 'custom:entity',
      '@type': 'Thing',
      name: 'Custom Entity',
    };

    const config = createJsonLdConfig().addEntities([additionalEntity]).getConfig();

    expect(config.additionalEntities).toMatchSnapshot();
  });

  test('supports custom pipes configuration', () => {
    const customPipe = (graph: JsonLdGraph) =>
      graph.filter((entity) => entity['@type'] === 'Person');

    const config = createJsonLdConfig().pipe(customPipe).getConfig();

    expect(config.pipes).toHaveLength(1);
    expect(typeof config.pipes![0]).toBe('function');
  });

  test('supports populate entities configuration', () => {
    const populateConfig = {
      'person:danlynch': [
        {
          property: 'knows',
          entities: [{ '@id': 'person:alice', '@type': 'Person', name: 'Alice' }],
        },
      ],
    };

    const config = createJsonLdConfig()
      .populateEntities(['person:danlynch'], populateConfig)
      .getConfig();

    expect(config.populateConfig).toMatchSnapshot();
  });
});

describe('JsonLdBuilder', () => {
  test('requires base graph', () => {
    const builder = createJsonLdBuilder();

    expect(() => builder.build()).toThrow('No base graph provided');
  });

  test('merges configuration', () => {
    const config = createJsonLdConfig().baseGraph(graph).includeIds(['org:hyperweb']).getConfig();

    const result = createJsonLdBuilder().mergeConfig(config).build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph']).toHaveLength(1);
    expect(parsed['@graph'][0]['@id']).toBe('org:hyperweb');
  });

  test('merges configuration with snapshot', () => {
    const config = createJsonLdConfig().baseGraph(graph).includeIds(['org:hyperweb']).getConfig();

    const result = createJsonLdBuilder().mergeConfig(config).build({ prettyPrint: true });
    expect(result).toMatchSnapshot();
  });

  test('supports runtime overrides', () => {
    const config = createJsonLdConfig()
      .baseGraph(graph)
      .includeIds(['org:hyperweb', 'person:john'])
      .getConfig();

    const result = createJsonLdBuilder()
      .mergeConfig(config)
      .excludeIds(['person:john']) // Runtime override
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(1);
    expect(parsed['@graph'][0]['@id']).toBe('org:hyperweb');
  });

  test('filters by type', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person'])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph'].length).toBeGreaterThan(0);
    // All entities should be Person type
    parsed['@graph'].forEach((entity: any) => {
      const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
      expect(types).toContain('Person');
    });
  });

  test('filters by type with snapshot', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('excludes types', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .excludeTypes(['ImageObject', 'Article'])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph'].length).toBeGreaterThan(0);

    // Check that excluded types are not present
    const types = parsed['@graph'].flatMap((entity: any) =>
      Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]
    );
    expect(types).not.toContain('ImageObject');
    expect(types).not.toContain('Article');
  });

  test('limits max entities', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .maxEntities(2)
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);
  });

  test('limits max entities with snapshot', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .maxEntities(3)
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('generates script tag', () => {
    const result = createJsonLdBuilder().baseGraph(graph).includeIds(['org:hyperweb']).build({
      withScriptTag: true,
      scriptId: 'test-json-ld',
      prettyPrint: false,
    });

    expect(result).toMatch(/^<script id="test-json-ld" type="application\/ld\+json">/);
    expect(result).toMatch(/<\/script>$/);
    expect(result).toContain('"@context":"https://schema.org"');
  });

  test('generates script tag with snapshot', () => {
    const result = createJsonLdBuilder().baseGraph(graph).includeIds(['org:hyperweb']).build({
      withScriptTag: true,
      scriptId: 'test-json-ld',
      prettyPrint: true,
    });

    expect(result).toMatchSnapshot();
  });

  test('supports custom context URL', () => {
    const result = createJsonLdBuilder().baseGraph(graph).includeIds(['org:hyperweb']).build({
      contextUrl: 'https://custom.context.url',
      prettyPrint: false,
    });

    const parsed = JSON.parse(result);
    expect(parsed['@context']).toBe('https://custom.context.url');
  });

  test('supports custom context URL with snapshot', () => {
    const result = createJsonLdBuilder().baseGraph(graph).includeIds(['org:hyperweb']).build({
      contextUrl: 'https://custom.context.url',
      prettyPrint: true,
    });

    expect(result).toMatchSnapshot();
  });

  test('adds additional entities', () => {
    const additionalEntity: JsonLdEntity = {
      '@id': 'custom:entity',
      '@type': 'Thing',
      name: 'Custom Entity',
    };

    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['org:hyperweb'])
      .addEntities([additionalEntity])
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(2);
    expect(parsed['@graph'].some((entity: any) => entity['@id'] === 'custom:entity')).toBe(true);
  });

  test('adds additional entities with snapshot', () => {
    const additionalEntity: JsonLdEntity = {
      '@id': 'custom:entity',
      '@type': 'Thing',
      name: 'Custom Entity',
    };

    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['org:hyperweb'])
      .addEntities([additionalEntity])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('applies custom pipes', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person', 'Organization'])
      .pipe((graph) => graph.filter((entity) => entity['@id'] !== 'person:john'))
      .build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph'].length).toBeGreaterThan(0);
    // Should not contain person:john
    expect(parsed['@graph'].some((entity: any) => entity['@id'] === 'person:john')).toBe(false);
  });

  test('applies custom pipes with snapshot', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person'])
      .pipe((graph) => graph.filter((entity) => entity['@id'] !== 'person:john'))
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('gets current graph', () => {
    const builder = createJsonLdBuilder().baseGraph(graph).includeIds(['org:hyperweb']);

    const currentGraph = builder.getCurrentGraph();
    expect(currentGraph).toHaveLength(1);
    expect(currentGraph[0]['@id']).toBe('org:hyperweb');
  });

  test('gets current graph with snapshot', () => {
    const builder = createJsonLdBuilder().baseGraph(graph).includeTypes(['Person']);

    const currentGraph = builder.getCurrentGraph();
    expect(currentGraph).toMatchSnapshot();
  });

  // Comprehensive tests for subgraph extraction
  test('extracts subgraph from root entity', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .subgraph(['person:danlynch'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('extracts subgraph from multiple roots', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .subgraph(['org:hyperweb', 'event:cosmjs-roadmap'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Comprehensive tests for property filtering
  test('filters properties by entity IDs', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['org:hyperweb'])
      .filterPropertiesByIds(['org:hyperweb'], { exclude: ['member'] })
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters properties by entity types', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person'])
      .filterPropertiesByTypes(['Person'], { include: ['name', 'email'] })
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Tests for complex filtering combinations
  test('combines multiple filter types', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person', 'Organization'])
      .excludeIds(['person:jane'])
      .maxEntities(5)
      .requiredProperties(['name'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters with required properties', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .requiredProperties(['email'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('excludes entities with specific properties', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .excludeEntitiesWithProperties(['foundingDate'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Tests for different entity types in fixture data
  test('filters events', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Event'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters places', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Place'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters software applications', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['SoftwareApplication'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters courses', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Course'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters reviews', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Review'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('filters creative works', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['CreativeWork'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Tests for configuration merging and clearing
  test('merges configurations correctly', () => {
    const baseConfig = createJsonLdConfig().baseGraph(graph).includeIds(['org:hyperweb']);

    const extendedConfig = baseConfig.includeIds(['person:danlynch']).excludeTypes(['ImageObject']);

    const result = createJsonLdBuilder()
      .mergeConfig(extendedConfig.getConfig())
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('clears configuration correctly', () => {
    const config = createJsonLdConfig()
      .baseGraph(graph)
      .includeIds(['org:hyperweb'])
      .excludeTypes(['ImageObject'])
      .clearIds()
      .includeTypes(['Person'])
      .getConfig();

    const result = createJsonLdBuilder().mergeConfig(config).build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Tests for edge cases
  test('handles empty include IDs', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds([])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('handles non-existent entity IDs', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['non:existent'])
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  test('handles complex entity relationships', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['person:danlynch'])
      .build({ prettyPrint: true });

    const parsed = JSON.parse(result);
    expect(parsed['@graph']).toHaveLength(1);
    expect(parsed['@graph'][0]['@id']).toBe('person:danlynch');
    expect(parsed['@graph'][0]).toHaveProperty('knows');
    expect(parsed['@graph'][0]).toHaveProperty('worksFor');
  });

  // Tests for populate functionality
  test('populates entities with additional data', () => {
    const populateConfig = {
      'person:danlynch': [
        {
          property: 'additionalInfo',
          entities: [{ '@id': 'info:1', '@type': 'Thing', description: 'Additional info' }],
        },
      ],
    };

    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['person:danlynch'])
      .populateEntities(['person:danlynch'], populateConfig)
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });

  // Tests for multiple entity types
  test('handles entities with multiple types', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['person:john'])
      .build({ prettyPrint: true });

    const parsed = JSON.parse(result);
    expect(parsed['@graph'][0]['@type']).toEqual(['Person', 'Developer']);
  });

  // Tests for complex property structures
  test('handles nested property structures', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeIds(['place:san-francisco'])
      .build({ prettyPrint: true });

    const parsed = JSON.parse(result);
    const place = parsed['@graph'][0];
    expect(place).toHaveProperty('address');
    expect(place.address).toHaveProperty('@type', 'PostalAddress');
    expect(place).toHaveProperty('geo');
    expect(place.geo).toHaveProperty('@type', 'GeoCoordinates');
  });

  // Performance and stress tests
  test('handles large entity sets efficiently', () => {
    const result = createJsonLdBuilder().baseGraph(graph).build({ prettyPrint: false });

    const parsed = JSON.parse(result);
    expect(parsed['@graph'].length).toBe(graph.length);
  });

  test('chains multiple operations efficiently', () => {
    const result = createJsonLdBuilder()
      .baseGraph(graph)
      .includeTypes(['Person', 'Organization'])
      .excludeIds(['person:jane'])
      .filterPropertiesByTypes(['Person'], { exclude: ['knows'] })
      .maxEntities(10)
      .pipe((graph) => graph.sort((a, b) => a['@id'].localeCompare(b['@id'])))
      .build({ prettyPrint: true });

    expect(result).toMatchSnapshot();
  });
});
