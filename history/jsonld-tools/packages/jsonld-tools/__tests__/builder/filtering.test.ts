/**
 * Comprehensive filtering tests for JSON-LD Builder
 *
 * Tests the complex filtering logic that preserves the behavior from
 * the current head-manager system.
 */

import type { JsonLdGraph } from '../../src';
import { createJsonLdBuilder, createJsonLdConfig } from '../../src';

// Extended test data with more complex relationships
const complexTestGraph: JsonLdGraph = [
  {
    '@id': 'org:hyperweb',
    '@type': 'Organization',
    name: 'Hyperweb',
    url: 'https://hyperweb.io',
    subjectOf: ['article:1', 'article:2'],
    member: [{ '@id': 'person:john' }, { '@id': 'person:jane' }],
  },
  {
    '@id': 'person:john',
    '@type': 'Person',
    name: 'John Doe',
    worksFor: { '@id': 'org:hyperweb' },
    author: ['article:1'],
  },
  {
    '@id': 'person:jane',
    '@type': 'Person',
    name: 'Jane Smith',
    worksFor: { '@id': 'org:hyperweb' },
    author: ['article:2'],
  },
  {
    '@id': 'article:1',
    '@type': 'Article',
    headline: 'Test Article 1',
    author: { '@id': 'person:john' },
    publisher: { '@id': 'org:hyperweb' },
  },
  {
    '@id': 'article:2',
    '@type': 'Article',
    headline: 'Test Article 2',
    author: { '@id': 'person:jane' },
    publisher: { '@id': 'org:hyperweb' },
  },
  {
    '@id': 'image:1',
    '@type': 'ImageObject',
    url: 'https://example.com/image1.jpg',
    about: { '@id': 'article:1' },
  },
  {
    '@id': 'image:2',
    '@type': 'ImageObject',
    url: 'https://example.com/image2.jpg',
    about: { '@id': 'article:2' },
  },
  {
    '@id': 'software:tool',
    '@type': 'SoftwareApplication',
    name: 'Test Tool',
    creator: { '@id': 'org:hyperweb' },
  },
];

describe('JsonLdBuilder Complex Filtering', () => {
  describe('Property Filtering', () => {
    test('filters properties by entity IDs', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeIds(['org:hyperweb'])
        .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf', 'member'] })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      const org = parsed['@graph'][0];

      expect(org['@id']).toBe('org:hyperweb');
      expect(org.name).toBe('Hyperweb');
      expect(org.url).toBe('https://hyperweb.io');
      expect(org.subjectOf).toBeUndefined();
      expect(org.member).toBeUndefined();
    });

    test('filters properties by entity types', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeTypes(['Article'])
        .filterPropertiesByTypes(['Article'], { include: ['@id', '@type', 'headline'] })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      expect(parsed['@graph']).toHaveLength(2);

      parsed['@graph'].forEach((article: any) => {
        expect(article['@type']).toBe('Article');
        expect(article.headline).toBeDefined();
        expect(article.author).toBeUndefined(); // Should be excluded
        expect(article.publisher).toBeUndefined(); // Should be excluded
      });
    });

    test('combines multiple property filter rules', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeTypes(['Organization', 'Person'])
        .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] })
        .filterPropertiesByTypes(['Person'], { exclude: ['author'] })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      expect(parsed['@graph']).toHaveLength(3); // 1 org + 2 people

      const org = parsed['@graph'].find((e: any) => e['@id'] === 'org:hyperweb');
      expect(org.subjectOf).toBeUndefined();
      expect(org.member).toBeDefined(); // Not excluded

      const people = parsed['@graph'].filter((e: any) => e['@type'] === 'Person');
      people.forEach((person: any) => {
        expect(person.author).toBeUndefined(); // Should be excluded
        expect(person.worksFor).toBeDefined(); // Not excluded
      });
    });
  });

  describe('Subgraph Extraction', () => {
    test('extracts subgraph with property filtering', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .subgraph(['org:hyperweb'])
        .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should include org and all referenced entities
      expect(parsed['@graph'].length).toBeGreaterThan(1);

      const org = parsed['@graph'].find((e: any) => e['@id'] === 'org:hyperweb');
      expect(org).toBeDefined();
      expect(org.subjectOf).toBeUndefined(); // Property filtered out

      // Should include referenced people
      const john = parsed['@graph'].find((e: any) => e['@id'] === 'person:john');
      const jane = parsed['@graph'].find((e: any) => e['@id'] === 'person:jane');
      expect(john).toBeDefined();
      expect(jane).toBeDefined();
    });

    test('subgraph extraction and entity filters work in layers', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .subgraph(['person:john'])
        .excludeTypes(['Article']) // This will be applied after subgraph extraction
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should include john but exclude articles due to the filter
      const john = parsed['@graph'].find((e: any) => e['@id'] === 'person:john');
      const article = parsed['@graph'].find((e: any) => e['@type'] === 'Article');

      expect(john).toBeDefined();
      expect(article).toBeUndefined(); // Article should be filtered out by excludeTypes
    });
  });

  describe('Configuration Merging', () => {
    test('merges configurations correctly', () => {
      const baseConfig = createJsonLdConfig()
        .baseGraph(complexTestGraph)
        .includeTypes(['Organization', 'Person'])
        .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] });

      const extendedConfig = baseConfig
        .excludeTypes(['Person']) // Override includeTypes
        .filterPropertiesByTypes(['Organization'], { exclude: ['member'] });

      const result = createJsonLdBuilder()
        .mergeConfig(extendedConfig.getConfig())
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should only have Organization (Person excluded)
      expect(parsed['@graph']).toHaveLength(1);
      expect(parsed['@graph'][0]['@type']).toBe('Organization');

      const org = parsed['@graph'][0];
      expect(org.subjectOf).toBeUndefined(); // Excluded by ID filter
      expect(org.member).toBeUndefined(); // Excluded by type filter
    });

    test('runtime overrides work correctly', () => {
      const config = createJsonLdConfig()
        .baseGraph(complexTestGraph)
        .includeTypes(['Organization', 'Person', 'Article'])
        .getConfig();

      const result = createJsonLdBuilder()
        .mergeConfig(config)
        .excludeTypes(['Article']) // Runtime override
        .maxEntities(2) // Runtime limit
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should have max 2 entities, no articles
      expect(parsed['@graph']).toHaveLength(2);
      expect(parsed['@graph'].every((e: any) => e['@type'] !== 'Article')).toBe(true);
    });
  });

  describe('Custom Filters and Pipes', () => {
    test('applies custom filter', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .customFilter((entity) => {
          const name = entity.name || entity.headline;
          return name && name.includes('Test');
        })
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should only include entities with "Test" in name or headline
      expect(parsed['@graph']).toHaveLength(3); // "Test Article 1", "Test Article 2", "Test Tool"
      parsed['@graph'].forEach((entity: any) => {
        const name = entity.name || entity.headline;
        expect(name).toMatch(/Test/);
      });
    });

    test('applies transformation pipes', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeTypes(['Person'])
        .pipe((graph) =>
          graph.map((entity) => ({
            ...entity,
            processed: true,
          }))
        )
        .pipe((graph) => graph.filter((entity) => entity['@id'] === 'person:john'))
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      expect(parsed['@graph']).toHaveLength(1);
      expect(parsed['@graph'][0]['@id']).toBe('person:john');
      expect(parsed['@graph'][0].processed).toBe(true);
    });
  });

  describe('Required Properties Filter', () => {
    test('filters by required properties', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .requiredProperties(['url'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should only include entities with 'url' property
      parsed['@graph'].forEach((entity: any) => {
        expect(entity.url).toBeDefined();
      });
    });

    test('filters by excluded properties', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .excludeEntitiesWithProperties(['author'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);

      // Should exclude entities with 'author' property
      parsed['@graph'].forEach((entity: any) => {
        expect(entity.author).toBeUndefined();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty graph', () => {
      const result = createJsonLdBuilder()
        .baseGraph([])
        .includeTypes(['Organization'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      expect(parsed['@graph']).toHaveLength(0);
    });

    test('handles non-existent IDs', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeIds(['non:existent'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      expect(parsed['@graph']).toHaveLength(0);
    });

    test('handles non-existent types', () => {
      const result = createJsonLdBuilder()
        .baseGraph(complexTestGraph)
        .includeTypes(['NonExistentType'])
        .build({ prettyPrint: false });

      const parsed = JSON.parse(result);
      expect(parsed['@graph']).toHaveLength(0);
    });
  });
});
