/**
 * Config Merging Behavior Tests for JSON-LD Builder
 *
 * Tests the new consistent merging behavior and clear methods
 */

import { createJsonLdConfig, createJsonLdBuilder } from '../../src';

describe('Config Merging Behavior', () => {
  describe('Default Merging', () => {
    test('includeIds merges by default', () => {
      const config = createJsonLdConfig().includeIds(['a', 'b']).includeIds(['c', 'd']).getConfig();

      expect(config.filters?.includeIds).toEqual(['a', 'b', 'c', 'd']);
    });

    test('excludeIds merges by default', () => {
      const config = createJsonLdConfig().excludeIds(['a', 'b']).excludeIds(['c', 'd']).getConfig();

      expect(config.filters?.excludeIds).toEqual(['a', 'b', 'c', 'd']);
    });

    test('includeTypes merges by default', () => {
      const config = createJsonLdConfig()
        .includeTypes(['Person', 'Organization'])
        .includeTypes(['Article', 'WebSite'])
        .getConfig();

      expect(config.filters?.includeTypes).toEqual([
        'Person',
        'Organization',
        'Article',
        'WebSite',
      ]);
    });

    test('excludeTypes merges by default', () => {
      const config = createJsonLdConfig()
        .excludeTypes(['ImageObject'])
        .excludeTypes(['VideoObject'])
        .getConfig();

      expect(config.filters?.excludeTypes).toEqual(['ImageObject', 'VideoObject']);
    });

    test('requiredProperties merges by default', () => {
      const config = createJsonLdConfig()
        .requiredProperties(['name'])
        .requiredProperties(['url'])
        .getConfig();

      expect(config.filters?.requiredProperties).toEqual(['name', 'url']);
    });

    test('excludeEntitiesWithProperties merges by default', () => {
      const config = createJsonLdConfig()
        .excludeEntitiesWithProperties(['internal'])
        .excludeEntitiesWithProperties(['draft'])
        .getConfig();

      expect(config.filters?.excludeEntitiesWithProperties).toEqual(['internal', 'draft']);
    });

    test('multiple calls with empty arrays still work', () => {
      const config = createJsonLdConfig()
        .includeIds(['a'])
        .includeIds([])
        .includeIds(['b'])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['a', 'b']);
    });

    test('mixed configuration merging works correctly', () => {
      const config = createJsonLdConfig()
        .includeIds(['id1', 'id2'])
        .includeTypes(['Person'])
        .excludeIds(['exclude1'])
        .includeIds(['id3'])
        .excludeTypes(['ImageObject'])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['id1', 'id2', 'id3']);
      expect(config.filters?.includeTypes).toEqual(['Person']);
      expect(config.filters?.excludeIds).toEqual(['exclude1']);
      expect(config.filters?.excludeTypes).toEqual(['ImageObject']);
    });
  });

  describe('Clear Methods', () => {
    test('clearIds clears both include and exclude IDs', () => {
      const config = createJsonLdConfig()
        .includeIds(['a', 'b'])
        .excludeIds(['c', 'd'])
        .clearIds()
        .getConfig();

      expect(config.filters?.includeIds).toBeUndefined();
      expect(config.filters?.excludeIds).toBeUndefined();
    });

    test('clearTypes clears both include and exclude types', () => {
      const config = createJsonLdConfig()
        .includeTypes(['Person'])
        .excludeTypes(['ImageObject'])
        .clearTypes()
        .getConfig();

      expect(config.filters?.includeTypes).toBeUndefined();
      expect(config.filters?.excludeTypes).toBeUndefined();
    });

    test('clearPropertyRequirements clears both property requirements', () => {
      const config = createJsonLdConfig()
        .requiredProperties(['name'])
        .excludeEntitiesWithProperties(['internal'])
        .clearPropertyRequirements()
        .getConfig();

      expect(config.filters?.requiredProperties).toBeUndefined();
      expect(config.filters?.excludeEntitiesWithProperties).toBeUndefined();
    });

    test('clearPropertyFilters clears all property filters', () => {
      const config = createJsonLdConfig()
        .filterPropertiesByIds(['org:1'], { exclude: ['internal'] })
        .filterPropertiesByTypes(['Person'], { include: ['name'] })
        .clearPropertyFilters()
        .getConfig();

      expect(config.filters?.propertyFiltersByIds).toBeUndefined();
      expect(config.filters?.propertyFiltersByTypes).toBeUndefined();
    });

    test('clearSubgraph clears subgraph roots', () => {
      const config = createJsonLdConfig().subgraph(['org:hyperweb']).clearSubgraph().getConfig();

      expect(config.filters?.subgraphRoots).toBeUndefined();
    });

    test('clearAll clears everything except baseGraph', () => {
      const graph = [{ '@id': 'test', '@type': 'Thing' }];
      const config = createJsonLdConfig()
        .baseGraph(graph)
        .includeIds(['a'])
        .excludeTypes(['ImageObject'])
        .addEntities([{ '@id': 'extra', '@type': 'Thing' }])
        .clearAll()
        .getConfig();

      expect(config.baseGraph).toBe(graph);
      expect(config.filters).toBeUndefined();
      expect(config.additionalEntities).toBeUndefined();
    });

    test('clear methods are selective - only clear specified config', () => {
      const config = createJsonLdConfig()
        .includeIds(['keep-these'])
        .includeTypes(['Person'])
        .requiredProperties(['name'])
        .clearTypes()
        .getConfig();

      // Types should be cleared
      expect(config.filters?.includeTypes).toBeUndefined();
      expect(config.filters?.excludeTypes).toBeUndefined();

      // Other config should remain
      expect(config.filters?.includeIds).toEqual(['keep-these']);
      expect(config.filters?.requiredProperties).toEqual(['name']);
    });
  });

  describe('Clear and Rebuild Patterns', () => {
    test('clear then add creates fresh configuration', () => {
      const config = createJsonLdConfig()
        .includeIds(['old1', 'old2'])
        .clearIds()
        .includeIds(['new1', 'new2'])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['new1', 'new2']);
    });

    test('chaining clear methods works correctly', () => {
      const config = createJsonLdConfig()
        .includeIds(['a'])
        .excludeIds(['b'])
        .includeTypes(['Person'])
        .excludeTypes(['ImageObject'])
        .clearIds()
        .clearTypes()
        .includeIds(['new'])
        .includeTypes(['Article'])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['new']);
      expect(config.filters?.excludeIds).toBeUndefined();
      expect(config.filters?.includeTypes).toEqual(['Article']);
      expect(config.filters?.excludeTypes).toBeUndefined();
    });

    test('clear in middle of chain works correctly', () => {
      const config = createJsonLdConfig()
        .includeIds(['first'])
        .includeTypes(['Person'])
        .clearIds()
        .includeIds(['second'])
        .includeTypes(['Organization'])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['second']);
      expect(config.filters?.includeTypes).toEqual(['Person', 'Organization']);
    });
  });

  describe('Immutability', () => {
    test('clear methods return new instances', () => {
      const original = createJsonLdConfig().includeIds(['a', 'b']);
      const cleared = original.clearIds();

      expect(original).not.toBe(cleared);
      expect(original.getConfig().filters?.includeIds).toEqual(['a', 'b']);
      expect(cleared.getConfig().filters?.includeIds).toBeUndefined();
    });

    test('merging methods return new instances', () => {
      const original = createJsonLdConfig().includeIds(['a', 'b']);
      const extended = original.includeIds(['c', 'd']);

      expect(original).not.toBe(extended);
      expect(original.getConfig().filters?.includeIds).toEqual(['a', 'b']);
      expect(extended.getConfig().filters?.includeIds).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('Edge Cases', () => {
    test('clearing empty configuration works', () => {
      const config = createJsonLdConfig().clearIds().clearTypes().clearAll().getConfig();

      expect(config).toEqual({});
    });

    test('duplicate values in merging are preserved', () => {
      const config = createJsonLdConfig().includeIds(['a', 'b']).includeIds(['b', 'c']).getConfig();

      expect(config.filters?.includeIds).toEqual(['a', 'b', 'b', 'c']);
    });

    test('undefined and empty array handling', () => {
      const config = createJsonLdConfig()
        .includeIds([])
        .includeIds(['a'])
        .includeIds([])
        .getConfig();

      expect(config.filters?.includeIds).toEqual(['a']);
    });
  });

  describe('Configuration Merging Methods', () => {
    describe('mergeConfig', () => {
      test('merges complete configurations', () => {
        const baseConfig = createJsonLdConfig()
          .includeTypes(['Person'])
          .includeIds(['a', 'b'])
          .addEntities([{ '@id': 'base', '@type': 'Thing' }]);

        const otherConfig = createJsonLdConfig()
          .includeTypes(['Organization'])
          .excludeIds(['c', 'd'])
          .addEntities([{ '@id': 'other', '@type': 'Thing' }])
          .getConfig();

        const merged = baseConfig.mergeConfig(otherConfig).getConfig();

        expect(merged.filters?.includeTypes).toEqual(['Person', 'Organization']);
        expect(merged.filters?.includeIds).toEqual(['a', 'b']);
        expect(merged.filters?.excludeIds).toEqual(['c', 'd']);
        expect(merged.additionalEntities).toEqual([
          { '@id': 'base', '@type': 'Thing' },
          { '@id': 'other', '@type': 'Thing' },
        ]);
      });

      test('merges baseGraph with override precedence', () => {
        const graph1 = [{ '@id': 'test1', '@type': 'Thing' }];
        const graph2 = [{ '@id': 'test2', '@type': 'Thing' }];

        const baseConfig = createJsonLdConfig().baseGraph(graph1);
        const otherConfig = createJsonLdConfig().baseGraph(graph2).getConfig();

        const merged = baseConfig.mergeConfig(otherConfig).getConfig();

        expect(merged.baseGraph).toBe(graph2);
      });

      test('merges with empty configuration', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']).includeIds(['a']);

        const merged = baseConfig.mergeConfig({}).getConfig();

        expect(merged.filters?.includeTypes).toEqual(['Person']);
        expect(merged.filters?.includeIds).toEqual(['a']);
      });

      test('returns new instance', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']);
        const otherConfig = { filters: { includeTypes: ['Organization'] } };

        const merged = baseConfig.mergeConfig(otherConfig);

        expect(merged).not.toBe(baseConfig);
        expect(baseConfig.getConfig().filters?.includeTypes).toEqual(['Person']);
        expect(merged.getConfig().filters?.includeTypes).toEqual(['Person', 'Organization']);
      });
    });

    describe('mergeFilters', () => {
      test('merges filter options only', () => {
        const baseConfig = createJsonLdConfig()
          .includeTypes(['Person'])
          .includeIds(['a', 'b'])
          .addEntities([{ '@id': 'base', '@type': 'Thing' }]);

        const otherFilters = {
          includeTypes: ['Organization'],
          excludeIds: ['c', 'd'],
          maxEntities: 10,
        };

        const merged = baseConfig.mergeFilters(otherFilters).getConfig();

        expect(merged.filters?.includeTypes).toEqual(['Person', 'Organization']);
        expect(merged.filters?.includeIds).toEqual(['a', 'b']);
        expect(merged.filters?.excludeIds).toEqual(['c', 'd']);
        expect(merged.filters?.maxEntities).toBe(10);
        expect(merged.additionalEntities).toEqual([{ '@id': 'base', '@type': 'Thing' }]);
      });

      test('merges with empty filters', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']).includeIds(['a']);

        const merged = baseConfig.mergeFilters({}).getConfig();

        expect(merged.filters?.includeTypes).toEqual(['Person']);
        expect(merged.filters?.includeIds).toEqual(['a']);
      });

      test('merges complex filter options', () => {
        const baseConfig = createJsonLdConfig()
          .includeTypes(['Person'])
          .filterPropertiesByIds(['entity1'], { include: ['name'] })
          .subgraph(['root1']);

        const otherFilters = {
          includeTypes: ['Organization'],
          propertyFiltersByIds: [{ entityIds: ['entity2'], include: ['title'] }],
          subgraphRoots: ['root2'],
          customFilter: (entity: any) => entity['@type'] === 'Person',
        };

        const merged = baseConfig.mergeFilters(otherFilters).getConfig();

        expect(merged.filters?.includeTypes).toEqual(['Person', 'Organization']);
        expect(merged.filters?.subgraphRoots).toEqual(['root1', 'root2']);
        expect(merged.filters?.propertyFiltersByIds).toHaveLength(2);
        expect(merged.filters?.customFilter).toBe(otherFilters.customFilter);
      });

      test('returns new instance', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']);
        const otherFilters = { includeTypes: ['Organization'] };

        const merged = baseConfig.mergeFilters(otherFilters);

        expect(merged).not.toBe(baseConfig);
        expect(baseConfig.getConfig().filters?.includeTypes).toEqual(['Person']);
        expect(merged.getConfig().filters?.includeTypes).toEqual(['Person', 'Organization']);
      });
    });

    describe('chaining with other methods', () => {
      test('mergeConfig can be chained with other methods', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']);
        const otherConfig = { filters: { includeTypes: ['Organization'] } };

        const result = baseConfig
          .mergeConfig(otherConfig)
          .excludeTypes(['ImageObject'])
          .includeIds(['test'])
          .getConfig();

        expect(result.filters?.includeTypes).toEqual(['Person', 'Organization']);
        expect(result.filters?.excludeTypes).toEqual(['ImageObject']);
        expect(result.filters?.includeIds).toEqual(['test']);
      });

      test('mergeFilters can be chained with other methods', () => {
        const baseConfig = createJsonLdConfig().includeTypes(['Person']);
        const otherFilters = { includeTypes: ['Organization'] };

        const result = baseConfig
          .mergeFilters(otherFilters)
          .excludeTypes(['ImageObject'])
          .includeIds(['test'])
          .getConfig();

        expect(result.filters?.includeTypes).toEqual(['Person', 'Organization']);
        expect(result.filters?.excludeTypes).toEqual(['ImageObject']);
        expect(result.filters?.includeIds).toEqual(['test']);
      });
    });
  });

  describe('JsonLdBuilder Merge Methods', () => {
    const testGraph = [
      { '@id': 'person:1', '@type': 'Person', name: 'John' },
      { '@id': 'org:1', '@type': 'Organization', name: 'Acme Corp' },
      { '@id': 'image:1', '@type': 'ImageObject', url: 'test.jpg' },
    ];

    describe('mergeConfig in builder', () => {
      test('merges configuration and processes graph', () => {
        const config = createJsonLdConfig()
          .baseGraph(testGraph)
          .includeTypes(['Person'])
          .getConfig();

        const result = createJsonLdBuilder().mergeConfig(config).build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(1);
        expect(parsed['@graph'][0]['@type']).toBe('Person');
      });

      test('merges configuration with runtime overrides', () => {
        const config = createJsonLdConfig()
          .baseGraph(testGraph)
          .includeTypes(['Person', 'Organization'])
          .getConfig();

        const result = createJsonLdBuilder()
          .mergeConfig(config)
          .excludeTypes(['Organization']) // Runtime override
          .build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(1);
        expect(parsed['@graph'][0]['@type']).toBe('Person');
      });

      test('merges multiple configurations', () => {
        const config1 = createJsonLdConfig()
          .baseGraph(testGraph)
          .includeTypes(['Person'])
          .getConfig();

        const config2 = createJsonLdConfig()
          .includeTypes(['Organization'])
          .excludeIds(['image:1'])
          .getConfig();

        const result = createJsonLdBuilder()
          .mergeConfig(config1)
          .mergeConfig(config2)
          .build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(2);
        const types = parsed['@graph'].map((e: any) => e['@type']);
        expect(types).toContain('Person');
        expect(types).toContain('Organization');
      });
    });

    describe('mergeFilters in builder', () => {
      test('merges filter options and processes graph', () => {
        const builder = createJsonLdBuilder().baseGraph(testGraph).includeTypes(['Person']);

        const filters = {
          includeTypes: ['Organization'],
          maxEntities: 1,
        };

        const result = builder.mergeFilters(filters).build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(1); // maxEntities limit
        const types = parsed['@graph'].map((e: any) => e['@type']);
        expect(['Person', 'Organization']).toContain(types[0]);
      });

      test('merges filters with runtime method calls', () => {
        const builder = createJsonLdBuilder().baseGraph(testGraph).includeTypes(['Person']);

        const filters = {
          includeTypes: ['Organization'],
        };

        const result = builder
          .mergeFilters(filters)
          .excludeIds(['org:1']) // Runtime override
          .build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(1);
        expect(parsed['@graph'][0]['@type']).toBe('Person');
      });
    });

    describe('chaining merge methods in builder', () => {
      test('can chain mergeConfig and mergeFilters', () => {
        const config = createJsonLdConfig()
          .baseGraph(testGraph)
          .includeTypes(['Person'])
          .getConfig();

        const filters = {
          includeTypes: ['Organization'],
        };

        const result = createJsonLdBuilder()
          .mergeConfig(config)
          .mergeFilters(filters)
          .excludeIds(['image:1']) // Runtime method
          .build({ prettyPrint: false });

        const parsed = JSON.parse(result);
        expect(parsed['@graph']).toHaveLength(2);
        const types = parsed['@graph'].map((e: any) => e['@type']);
        expect(types).toContain('Person');
        expect(types).toContain('Organization');
      });
    });
  });
});
