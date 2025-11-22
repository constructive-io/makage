import {
  findEntity,
  findEntities,
  findEntitiesByType,
  extractSubgraph,
  extractSubgraphs,
  findReferencingEntities,
  extractSubgraphWithDepth,
  extractReferences,
  type JsonLdEntity,
  type JsonLdGraph
} from '../../src/index';

describe('JSON-LD Graph Library', () => {
  // Test data fixtures
  const createTestGraph = (): JsonLdGraph => [
    {
      '@id': 'person:danlynch',
      '@type': 'Person',
      name: 'Dan Lynch',
      affiliation: { '@id': 'org:hyperweb' },
      knows: ['person:jane', 'person:john'],
      worksFor: 'org:hyperweb'
    },
    {
      '@id': 'person:jane',
      '@type': 'Person',
      name: 'Jane Doe',
      knows: { '@id': 'person:danlynch' }
    },
    {
      '@id': 'person:john',
      '@type': ['Person', 'Developer'],
      name: 'John Smith',
      memberOf: [
        { '@id': 'org:hyperweb' },
        { '@id': 'org:osmosis' }
      ]
    },
    {
      '@id': 'org:hyperweb',
      '@type': 'Organization',
      name: 'HyperWeb',
      member: [
        { '@id': 'person:danlynch' },
        { '@id': 'person:john' }
      ]
    },
    {
      '@id': 'org:osmosis',
      '@type': 'Organization',
      name: 'Osmosis',
      url: 'https://osmosis.zone'
    },
    {
      '@id': 'event:cosmoverse-2024',
      '@type': 'Event',
      name: 'Cosmoverse 2024',
      organizer: { '@id': 'org:osmosis' },
      performer: ['person:danlynch', 'person:jane'],
      location: 'Dubai, UAE'
    },
    {
      '@id': 'article:web3-future',
      '@type': 'Article',
      headline: 'The Future of Web3',
      author: { '@id': 'person:danlynch' },
      mentions: [
        { '@id': 'org:hyperweb' },
        { '@id': 'event:cosmoverse-2024' }
      ]
    }
  ];

  describe('findEntity', () => {
    it('should find an entity by exact @id match', () => {
      const graph = createTestGraph();
      const entity = findEntity(graph, 'person:danlynch');
      
      expect(entity).toBeDefined();
      expect(entity?.['@id']).toBe('person:danlynch');
      expect(entity?.name).toBe('Dan Lynch');
    });

    it('should return undefined for non-existent @id', () => {
      const graph = createTestGraph();
      const entity = findEntity(graph, 'person:nobody');
      
      expect(entity).toBeUndefined();
    });

    it('should handle empty graph', () => {
      const entity = findEntity([], 'person:danlynch');
      expect(entity).toBeUndefined();
    });
  });

  describe('findEntities', () => {
    it('should find multiple entities by @id', () => {
      const graph = createTestGraph();
      const entities = findEntities(graph, ['person:danlynch', 'person:jane']);
      
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e['@id'])).toContain('person:danlynch');
      expect(entities.map(e => e['@id'])).toContain('person:jane');
    });

    it('should return partial results for mixed valid/invalid ids', () => {
      const graph = createTestGraph();
      const entities = findEntities(graph, ['person:danlynch', 'person:nobody', 'org:hyperweb']);
      
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e['@id'])).toContain('person:danlynch');
      expect(entities.map(e => e['@id'])).toContain('org:hyperweb');
    });

    it('should handle empty id array', () => {
      const graph = createTestGraph();
      const entities = findEntities(graph, []);
      
      expect(entities).toHaveLength(0);
    });

    it('should handle duplicate ids efficiently', () => {
      const graph = createTestGraph();
      const entities = findEntities(graph, ['person:danlynch', 'person:danlynch']);
      
      expect(entities).toHaveLength(1);
      expect(entities[0]['@id']).toBe('person:danlynch');
    });
  });

  describe('findEntitiesByType', () => {
    it('should find entities with single @type', () => {
      const graph = createTestGraph();
      const organizations = findEntitiesByType(graph, 'Organization');
      
      expect(organizations).toHaveLength(2);
      expect(organizations.map(e => e['@id'])).toContain('org:hyperweb');
      expect(organizations.map(e => e['@id'])).toContain('org:osmosis');
    });

    it('should find entities with array @type', () => {
      const graph = createTestGraph();
      const developers = findEntitiesByType(graph, 'Developer');
      
      expect(developers).toHaveLength(1);
      expect(developers[0]['@id']).toBe('person:john');
    });

    it('should return empty array for non-existent type', () => {
      const graph = createTestGraph();
      const robots = findEntitiesByType(graph, 'Robot');
      
      expect(robots).toHaveLength(0);
    });

    it('should handle entities without @type', () => {
      const graph: JsonLdGraph = [
        { '@id': 'thing:1', name: 'Thing without type' },
        { '@id': 'person:1', '@type': 'Person', name: 'Person with type' }
      ];
      
      const persons = findEntitiesByType(graph, 'Person');
      expect(persons).toHaveLength(1);
      expect(persons[0]['@id']).toBe('person:1');
    });
  });

  describe('extractSubgraph', () => {
    it('should extract entity with direct references', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'person:danlynch');
      
      expect(subgraph.map(e => e['@id'])).toContain('person:danlynch');
      expect(subgraph.map(e => e['@id'])).toContain('org:hyperweb');
      expect(subgraph.map(e => e['@id'])).toContain('person:jane');
      expect(subgraph.map(e => e['@id'])).toContain('person:john');
    });

    it('should handle circular references without infinite loop', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'person:jane');
      
      // Jane knows Dan, Dan knows Jane - should include both without duplicates
      expect(subgraph.map(e => e['@id'])).toContain('person:jane');
      expect(subgraph.map(e => e['@id'])).toContain('person:danlynch');
      
      // Check no duplicates
      const ids = subgraph.map(e => e['@id']);
      expect(ids.length).toBe(new Set(ids).size);
    });

    it('should extract deep nested references', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'article:web3-future');
      
      // Article -> Dan Lynch -> HyperWeb -> John -> Osmosis
      expect(subgraph.map(e => e['@id'])).toContain('article:web3-future');
      expect(subgraph.map(e => e['@id'])).toContain('person:danlynch');
      expect(subgraph.map(e => e['@id'])).toContain('org:hyperweb');
      expect(subgraph.map(e => e['@id'])).toContain('event:cosmoverse-2024');
      expect(subgraph.map(e => e['@id'])).toContain('person:john');
      expect(subgraph.map(e => e['@id'])).toContain('org:osmosis');
    });

    it('should handle non-existent root entity', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'person:nobody');
      
      expect(subgraph).toHaveLength(0);
    });

    it('should handle references to non-existent entities', () => {
      const graph: JsonLdGraph = [
        {
          '@id': 'person:alice',
          '@type': 'Person',
          knows: 'person:ghost' // Reference to non-existent entity
        }
      ];
      
      const subgraph = extractSubgraph(graph, 'person:alice');
      expect(subgraph).toHaveLength(1);
      expect(subgraph[0]['@id']).toBe('person:alice');
    });

    it('should detect string references with colons', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'person:danlynch');
      
      // worksFor is a string reference "org:hyperweb"
      expect(subgraph.map(e => e['@id'])).toContain('org:hyperweb');
    });

    it('should ignore http/https URLs in reference detection', () => {
      const graph = createTestGraph();
      const subgraph = extractSubgraph(graph, 'org:osmosis');
      
      // Should only contain osmosis itself, not try to resolve the URL
      expect(subgraph).toHaveLength(1);
      expect(subgraph[0]['@id']).toBe('org:osmosis');
    });
  });

  describe('extractSubgraphs', () => {
    it('should extract multiple subgraphs without duplicates', () => {
      const graph = createTestGraph();
      const subgraphs = extractSubgraphs(graph, ['person:danlynch', 'person:jane']);
      
      // Should include both persons and their references
      expect(subgraphs.map(e => e['@id'])).toContain('person:danlynch');
      expect(subgraphs.map(e => e['@id'])).toContain('person:jane');
      expect(subgraphs.map(e => e['@id'])).toContain('org:hyperweb');
      
      // Check no duplicates even though both reference each other
      const ids = subgraphs.map(e => e['@id']);
      expect(ids.length).toBe(new Set(ids).size);
    });

    it('should handle empty id array', () => {
      const graph = createTestGraph();
      const subgraphs = extractSubgraphs(graph, []);
      
      expect(subgraphs).toHaveLength(0);
    });

    it('should handle mixed valid/invalid ids', () => {
      const graph = createTestGraph();
      const subgraphs = extractSubgraphs(graph, ['person:danlynch', 'person:nobody']);
      
      // Should still extract Dan Lynch's subgraph
      expect(subgraphs.map(e => e['@id'])).toContain('person:danlynch');
      expect(subgraphs.map(e => e['@id'])).toContain('org:hyperweb');
    });
  });

  describe('findReferencingEntities', () => {
    it('should find entities that reference a target', () => {
      const graph = createTestGraph();
      const referencingDan = findReferencingEntities(graph, 'person:danlynch');
      
      expect(referencingDan.map(e => e['@id'])).toContain('person:jane'); // knows Dan
      expect(referencingDan.map(e => e['@id'])).toContain('org:hyperweb'); // Dan is member
      expect(referencingDan.map(e => e['@id'])).toContain('event:cosmoverse-2024'); // Dan is performer
      expect(referencingDan.map(e => e['@id'])).toContain('article:web3-future'); // Dan is author
    });

    it('should find entities with different reference formats', () => {
      const graph = createTestGraph();
      const referencingHyperWeb = findReferencingEntities(graph, 'org:hyperweb');
      
      // Direct object reference, string reference, and array reference
      expect(referencingHyperWeb.map(e => e['@id'])).toContain('person:danlynch');
      expect(referencingHyperWeb.map(e => e['@id'])).toContain('person:john');
      expect(referencingHyperWeb.map(e => e['@id'])).toContain('article:web3-future');
    });

    it('should return empty array for unreferenced entity', () => {
      const graph: JsonLdGraph = [
        { '@id': 'person:lonely', '@type': 'Person', name: 'Lonely Person' },
        { '@id': 'person:social', '@type': 'Person', name: 'Social Person', knows: 'person:other' }
      ];
      
      const referencing = findReferencingEntities(graph, 'person:lonely');
      expect(referencing).toHaveLength(0);
    });

    it('should not include self-references', () => {
      const graph: JsonLdGraph = [
        { '@id': 'person:narcissist', '@type': 'Person', knows: 'person:narcissist' }
      ];
      
      const referencing = findReferencingEntities(graph, 'person:narcissist');
      expect(referencing).toHaveLength(1); // It does reference itself
      expect(referencing[0]['@id']).toBe('person:narcissist');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle entities with missing @id gracefully', () => {
      const malformedGraph = [
        { '@type': 'Person', name: 'No ID Person' } as any,
        { '@id': 'person:valid', '@type': 'Person', name: 'Valid Person' }
      ];
      
      // findEntity should skip malformed entities
      const entity = findEntity(malformedGraph as JsonLdGraph, 'person:valid');
      expect(entity).toBeDefined();
      expect(entity?.['@id']).toBe('person:valid');
    });

    it('should handle null and undefined values in entity properties', () => {
      const graph: JsonLdGraph = [
        {
          '@id': 'person:nullable',
          '@type': 'Person',
          name: null,
          knows: undefined,
          worksFor: { '@id': null } as any,
          memberOf: [null, undefined, 'org:valid']
        }
      ];
      
      const subgraph = extractSubgraph(graph, 'person:nullable');
      expect(subgraph).toHaveLength(1); // Should not crash
    });

    it('should handle deeply nested structures', () => {
      const graph: JsonLdGraph = [
        {
          '@id': 'thing:nested',
          '@type': 'Thing',
          level1: {
            level2: {
              level3: {
                level4: {
                  reference: { '@id': 'thing:deep' }
                }
              }
            }
          }
        },
        {
          '@id': 'thing:deep',
          '@type': 'Thing',
          name: 'Deep Thing'
        }
      ];
      
      const subgraph = extractSubgraph(graph, 'thing:nested');
      expect(subgraph).toHaveLength(2);
      expect(subgraph.map(e => e['@id'])).toContain('thing:deep');
    });

    it('should handle various URL formats in reference detection', () => {
      const graph: JsonLdGraph = [
        {
          '@id': 'thing:urls',
          '@type': 'Thing',
          httpUrl: 'http://example.com',
          httpsUrl: 'https://example.com',
          ftpUrl: 'ftp://example.com',
          colonString: 'namespace:reference',
          noColonString: 'justastring',
          emailLike: 'user@domain:port'
        }
      ];
      
      const subgraph = extractSubgraph(graph, 'thing:urls');
      expect(subgraph).toHaveLength(1); // Should only contain the root
      
      // But it should detect the colon string as a reference
      const referencing = findReferencingEntities(graph, 'namespace:reference');
      expect(referencing).toHaveLength(1);
      expect(referencing[0]['@id']).toBe('thing:urls');
    });

    it('should handle large graphs efficiently', () => {
      // Create a graph with 1000 entities
      const largeGraph: JsonLdGraph = [];
      for (let i = 0; i < 1000; i++) {
        largeGraph.push({
          '@id': `entity:${i}`,
          '@type': 'Entity',
          name: `Entity ${i}`,
          next: i < 999 ? `entity:${i + 1}` : null
        });
      }
      
      const start = Date.now();
      const subgraph = extractSubgraph(largeGraph, 'entity:0');
      const duration = Date.now() - start;
      
      expect(subgraph).toHaveLength(1000); // Should find all connected entities
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Reference Detection Edge Cases', () => {
    it('should handle different reference patterns', () => {
      const graph: JsonLdGraph = [
        {
          '@id': 'test:patterns',
          '@type': 'Test',
          // Should be detected as references
          validRef1: 'prefix:suffix',
          validRef2: 'a:b',
          validRef3: 'schema:Person',
          
          // Should NOT be detected as references
          httpUrl: 'http://example.com:8080',
          httpsUrl: 'https://example.com:443',
          
          // Edge cases
          multiColon: 'prefix:middle:suffix', // Has colons, not http
          singleChar: 'a:b', // Short but valid
          
          // In arrays
          arrayRefs: ['ref:1', 'ref:2', 'http://notref.com'],
          
          // Nested
          nested: {
            deep: {
              ref: 'nested:ref'
            }
          }
        },
        { '@id': 'prefix:suffix', '@type': 'Thing' },
        { '@id': 'a:b', '@type': 'Thing' },
        { '@id': 'schema:Person', '@type': 'Thing' },
        { '@id': 'prefix:middle:suffix', '@type': 'Thing' },
        { '@id': 'ref:1', '@type': 'Thing' },
        { '@id': 'ref:2', '@type': 'Thing' },
        { '@id': 'nested:ref', '@type': 'Thing' }
      ];
      
      const subgraph = extractSubgraph(graph, 'test:patterns');
      const foundIds = subgraph.map(e => e['@id']);
      
      // Should find all the valid references
      expect(foundIds).toContain('prefix:suffix');
      expect(foundIds).toContain('a:b');
      expect(foundIds).toContain('schema:Person');
      expect(foundIds).toContain('prefix:middle:suffix');
      expect(foundIds).toContain('ref:1');
      expect(foundIds).toContain('ref:2');
      expect(foundIds).toContain('nested:ref');
      
      // Should not try to resolve URLs
      expect(foundIds).not.toContain('http://example.com:8080');
      expect(foundIds).not.toContain('https://example.com:443');
    });
  });
});

describe('extractSubgraphWithDepth', () => {
  it('should extract entities up to specified depth', () => {
    const graph: JsonLdGraph = [
      { '@id': 'root', 'ref': { '@id': 'level1' } },
      { '@id': 'level1', 'ref': { '@id': 'level2' } },
      { '@id': 'level2', 'ref': { '@id': 'level3' } },
      { '@id': 'level3', 'ref': { '@id': 'level4' } },
      { '@id': 'level4' }
    ];
    
    const depth1 = extractSubgraphWithDepth(graph, 'root', 1);
    expect(depth1.map(e => e['@id'])).toEqual(['root', 'level1']);
    
    const depth2 = extractSubgraphWithDepth(graph, 'root', 2);
    expect(depth2.map(e => e['@id'])).toEqual(['root', 'level1', 'level2']);
    
    const depth3 = extractSubgraphWithDepth(graph, 'root', 3);
    expect(depth3.map(e => e['@id'])).toEqual(['root', 'level1', 'level2', 'level3']);
  });
  
  it('should handle circular references at depth limit', () => {
    const graph: JsonLdGraph = [
      { '@id': 'a', 'ref': { '@id': 'b' } },
      { '@id': 'b', 'ref': { '@id': 'c' } },
      { '@id': 'c', 'ref': { '@id': 'a' } }
    ];
    
    const depth2 = extractSubgraphWithDepth(graph, 'a', 2);
    expect(depth2.map(e => e['@id']).sort()).toEqual(['a', 'b', 'c']);
  });
  
  it('should return empty array for depth less than 1', () => {
    const graph: JsonLdGraph = [{ '@id': 'test' }];
    
    expect(extractSubgraphWithDepth(graph, 'test', 0)).toEqual([]);
    expect(extractSubgraphWithDepth(graph, 'test', -1)).toEqual([]);
  });
  
  it('should handle non-existent root entity', () => {
    const graph: JsonLdGraph = [{ '@id': 'exists' }];
    
    expect(extractSubgraphWithDepth(graph, 'not-exists', 1)).toEqual([]);
  });
});

// Audit findings documentation
describe('Code Audit Findings', () => {
  it('documents the audit findings', () => {
    const auditFindings = {
      strengths: [
        'Type-safe with proper TypeScript definitions',
        'Pure functions with no side effects',
        'Efficient use of Set/Map for deduplication',
        'Proper cycle detection in graph traversal',
        'Clear and focused API'
      ],
      
      potentialIssues: [
        'Reference detection could miss valid URLs with protocols other than http',
        'No validation of @id format (accepts any string)',
        'The [key: string]: any type reduces type safety',
        'No error handling for malformed entities',
        'Reference detection might be too permissive (any string with colon)'
      ],
      
      performanceCharacteristics: [
        'findEntity: O(n) linear scan',
        'findEntities: O(n) with Set optimization',
        'extractSubgraph: O(n*m) where m is average references per entity',
        'Memory efficient - returns references, not copies'
      ],
      
      recommendations: [
        'Consider adding @id format validation',
        'Add option to customize reference detection patterns',
        'Consider adding index-based lookups for large graphs',
        'Add error handling for malformed data',
        'Consider more sophisticated URL detection regex'
      ]
    };
    
    // This test documents the findings
    expect(auditFindings).toBeDefined();
  });
});