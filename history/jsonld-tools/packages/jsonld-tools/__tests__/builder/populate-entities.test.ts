/**
 * Tests for new features added to JSON-LD Builder
 *
 * Tests the new functionality including validation improvements,
 * populateConfig, and script tag ID handling.
 */

import { createJsonLdBuilder, createJsonLdConfig } from '../../src';
import type { JsonLdGraph, PopulateConfig } from '../../src';

// Test data
const testGraph: JsonLdGraph = [
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
    headline: 'Test Article 1',
    author: { '@id': 'person:john' },
  },
];

describe('JSON-LD Builder New Features', () => {
  describe('Validation Improvements', () => {
    test('validates maxEntities correctly', () => {
      expect(() => {
        createJsonLdBuilder().baseGraph(testGraph).maxEntities(0).build();
      }).toThrow('maxEntities must be greater than 0');

      expect(() => {
        createJsonLdBuilder().baseGraph(testGraph).maxEntities(-1).build();
      }).toThrow('maxEntities must be greater than 0');
    });

    test('allows valid maxEntities', () => {
      expect(() => {
        createJsonLdBuilder().baseGraph(testGraph).maxEntities(1).build();
      }).not.toThrow();

      expect(() => {
        createJsonLdBuilder().baseGraph(testGraph).maxEntities(10).build();
      }).not.toThrow();
    });

    test('does not validate include/exclude conflicts during runtime', () => {
      // This should not throw because runtime validation is more lenient
      expect(() => {
        createJsonLdBuilder()
          .baseGraph(testGraph)
          .includeIds(['org:hyperweb'])
          .excludeIds(['org:hyperweb'])
          .build();
      }).not.toThrow();
    });
  });

  describe('PopulateConfig Functionality', () => {
    test('adds populateEntities method to config builder', () => {
      const populateConfig: PopulateConfig = {
        'org:hyperweb': [
          {
            property: 'employees',
            entities: [
              { '@id': 'person:alice', '@type': 'Person', name: 'Alice' },
              { '@id': 'person:bob', '@type': 'Person', name: 'Bob' },
            ],
          },
        ],
      };

      const config = createJsonLdConfig()
        .baseGraph(testGraph)
        .populateEntities(['org:hyperweb'], populateConfig)
        .getConfig();

      expect(config.populateConfig).toEqual(populateConfig);
    });

    test('merges multiple populateEntities calls', () => {
      const populateConfig1: PopulateConfig = {
        'org:hyperweb': [
          {
            property: 'employees',
            entities: [{ '@id': 'person:alice', '@type': 'Person', name: 'Alice' }],
          },
        ],
      };

      const populateConfig2: PopulateConfig = {
        'person:john': [
          {
            property: 'skills',
            entities: [{ '@id': 'skill:js', '@type': 'Skill', name: 'JavaScript' }],
          },
        ],
      };

      const config = createJsonLdConfig()
        .baseGraph(testGraph)
        .populateEntities(['org:hyperweb'], populateConfig1)
        .populateEntities(['person:john'], populateConfig2)
        .getConfig();

      expect(config.populateConfig).toEqual({
        ...populateConfig1,
        ...populateConfig2,
      });
    });

    test('applies populateConfig during graph processing', () => {
      const populateConfig: PopulateConfig = {
        'org:hyperweb': [
          {
            property: 'employees',
            entities: [
              { '@id': 'person:alice', '@type': 'Person', name: 'Alice' },
              { '@id': 'person:bob', '@type': 'Person', name: 'Bob' },
            ],
          },
        ],
      };

      const result = createJsonLdBuilder()
        .baseGraph(testGraph)
        .populateEntities(['org:hyperweb'], populateConfig)
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const org = parsed['@graph'].find((e: any) => e['@id'] === 'org:hyperweb');

      expect(org).toBeDefined();
      expect(org.employees).toEqual(populateConfig['org:hyperweb'][0].entities);
    });

    test('does not modify entities without populate config', () => {
      const populateConfig: PopulateConfig = {
        'org:hyperweb': [
          {
            property: 'employees',
            entities: [{ '@id': 'person:alice', '@type': 'Person', name: 'Alice' }],
          },
        ],
      };

      const result = createJsonLdBuilder()
        .baseGraph(testGraph)
        .populateEntities(['org:hyperweb'], populateConfig)
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const person = parsed['@graph'].find((e: any) => e['@id'] === 'person:john');

      expect(person).toBeDefined();
      expect(person.employees).toBeUndefined();
    });
  });

  describe('Script Tag ID Handling', () => {
    test('includes id attribute when scriptId is provided', () => {
      const result = createJsonLdBuilder().baseGraph(testGraph).build({
        withScriptTag: true,
        scriptId: 'my-json-ld',
      });

      expect(result).toContain('id="my-json-ld"');
      expect(result).toContain('<script id="my-json-ld" type="application/ld+json">');
    });

    test('does not include id attribute when scriptId is not provided', () => {
      const result = createJsonLdBuilder().baseGraph(testGraph).build({
        withScriptTag: true,
      });

      expect(result).not.toContain('id=');
      expect(result).toContain('<script type="application/ld+json">');
    });

    test('does not include id attribute when scriptId is empty string', () => {
      const result = createJsonLdBuilder().baseGraph(testGraph).build({
        withScriptTag: true,
        scriptId: '',
      });

      expect(result).not.toContain('id=');
      expect(result).toContain('<script type="application/ld+json">');
    });

    test('works correctly without script tag', () => {
      const result = createJsonLdBuilder().baseGraph(testGraph).build({
        withScriptTag: false,
        scriptId: 'should-be-ignored',
      });

      expect(result).not.toContain('<script');
      expect(result).not.toContain('id=');
    });
  });

  describe('Layered Processing Logic', () => {
    test('subgraph extraction and entity filters work together', () => {
      // First extract subgraph, then apply entity filters
      const result = createJsonLdBuilder()
        .baseGraph(testGraph)
        .subgraph(['person:john', 'org:hyperweb']) // Extract subgraph with both entities
        .excludeTypes(['Organization']) // Then filter out organizations
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const person = parsed['@graph'].find((e: any) => e['@id'] === 'person:john');
      const org = parsed['@graph'].find((e: any) => e['@id'] === 'org:hyperweb');

      expect(person).toBeDefined(); // Person should be included
      expect(org).toBeUndefined(); // Organization should be filtered out by excludeTypes
    });

    test('regular filtering works when no subgraph is specified', () => {
      const result = createJsonLdBuilder()
        .baseGraph(testGraph)
        .excludeTypes(['Person'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const person = parsed['@graph'].find((e: any) => e['@id'] === 'person:john');

      expect(person).toBeUndefined(); // Person should be excluded
    });

    test('property filters are applied only once', () => {
      // This test ensures property filters aren't applied twice
      // Include an entity filter to trigger the property filtering logic
      const result = createJsonLdBuilder()
        .baseGraph(testGraph)
        .includeIds(['org:hyperweb'])
        .filterPropertiesByIds(['org:hyperweb'], { exclude: ['url'] })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const org = parsed['@graph'].find((e: any) => e['@id'] === 'org:hyperweb');

      expect(org).toBeDefined();
      expect(org.url).toBeUndefined(); // URL should be filtered out
      expect(org.name).toBeDefined(); // Name should remain
    });
  });
});
