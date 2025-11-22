import {
  findMissingReferences,
  findNestedEntities,
  findOrphans,
  type JsonLdGraph
} from '../../src/index';
import enrichedGraph from '../../../../fixtures/graph.json';

describe('Graph Validation Methods', () => {
  describe('findMissingReferences', () => {
    it('should find missing references in enriched graph', () => {
      const missingRefs = findMissingReferences(enrichedGraph);
      
      // Log for debugging
      console.log('Missing references found:', missingRefs.length);
      if (missingRefs.length > 0) {
        console.log('First 10 missing references:', missingRefs.slice(0, 10));
      }
      
      expect(missingRefs).toMatchSnapshot();
    });
    
    it('should handle graph with no missing references', () => {
      const completeGraph: JsonLdGraph = [
        { '@id': 'a', 'ref': { '@id': 'b' } },
        { '@id': 'b', 'ref': { '@id': 'a' } }
      ];
      
      const missing = findMissingReferences(completeGraph);
      expect(missing).toEqual([]);
    });
    
    it('should find missing references in test graph', () => {
      const testGraph: JsonLdGraph = [
        { '@id': 'entity:1', 'knows': 'person:missing' },
        { '@id': 'entity:2', 'worksFor': { '@id': 'org:missing' } },
        { '@id': 'entity:3', 'refs': ['ref:1', 'ref:missing', 'ref:2'] },
        { '@id': 'ref:1' },
        { '@id': 'ref:2' }
      ];
      
      const missing = findMissingReferences(testGraph);
      expect(missing).toEqual(['org:missing', 'person:missing', 'ref:missing']);
    });
  });
  
  describe('findNestedEntities', () => {
    it('should find nested entities in enriched graph', () => {
      const nestedEntities = findNestedEntities(enrichedGraph);
      
      // Log for debugging
      console.log('Nested entities found:', nestedEntities.length);
      if (nestedEntities.length > 0) {
        console.log('First 5 nested entities:', nestedEntities.slice(0, 5).map(n => ({
          parentId: n.parentId,
          property: n.property,
          hasId: n.hasId,
          entityType: n.nestedEntity['@type']
        })));
      }
      
      expect(nestedEntities).toMatchSnapshot();
    });
    
    it('should identify nested entities correctly', () => {
      const testGraph: JsonLdGraph = [
        {
          '@id': 'person:1',
          'name': 'John',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': '123 Main St',
            'addressLocality': 'Anytown'
          },
          'worksFor': { '@id': 'org:1' }, // Just a reference, not nested
          'knows': [
            { '@id': 'person:2' }, // Just a reference
            {
              '@type': 'Person',
              'name': 'Jane',
              'email': 'jane@example.com'
            }
          ]
        },
        {
          '@id': 'org:1',
          'location': {
            '@id': 'place:1',
            '@type': 'Place',
            'name': 'HQ',
            'geo': {
              '@type': 'GeoCoordinates',
              'latitude': 37.7749,
              'longitude': -122.4194
            }
          }
        }
      ];
      
      const nested = findNestedEntities(testGraph);
      
      expect(nested).toHaveLength(4);
      
      // Check person:1's address
      expect(nested[0]).toEqual({
        parentId: 'person:1',
        property: 'address',
        nestedEntity: expect.objectContaining({
          '@type': 'PostalAddress',
          'streetAddress': '123 Main St'
        }),
        hasId: false
      });
      
      // Check person:1's knows[1] (Jane)
      expect(nested[1]).toEqual({
        parentId: 'person:1',
        property: 'knows[1]',
        nestedEntity: expect.objectContaining({
          '@type': 'Person',
          'name': 'Jane'
        }),
        hasId: false
      });
      
      // Check org:1's location (has @id but also other properties)
      expect(nested[2]).toEqual({
        parentId: 'org:1',
        property: 'location',
        nestedEntity: expect.objectContaining({
          '@id': 'place:1',
          '@type': 'Place',
          'name': 'HQ'
        }),
        hasId: true
      });
      
      // Check the nested geo inside location
      expect(nested[3]).toEqual({
        parentId: 'org:1',
        property: 'location.geo',
        nestedEntity: expect.objectContaining({
          '@type': 'GeoCoordinates',
          'latitude': 37.7749
        }),
        hasId: false
      });
    });
    
    it('should skip simple @id references', () => {
      const testGraph: JsonLdGraph = [
        {
          '@id': 'test:1',
          'ref1': { '@id': 'other:1' },
          'ref2': 'string:ref',
          'refs': [{ '@id': 'array:1' }, { '@id': 'array:2' }]
        }
      ];
      
      const nested = findNestedEntities(testGraph);
      expect(nested).toHaveLength(0);
    });
  });
  
  describe('findOrphans', () => {
    it('should find orphaned entities in enriched graph', () => {
      const orphans = findOrphans(enrichedGraph);
      
      // Log for debugging
      console.log('Orphaned entities found:', orphans.length);
      if (orphans.length > 0) {
        console.log('First 10 orphaned entities:', orphans.slice(0, 10));
        
        // Let's also show what types these orphans are
        const orphanTypes = orphans.slice(0, 10).map(id => {
          const entity = enrichedGraph.find(e => e['@id'] === id);
          return {
            id,
            type: entity?.['@type'] || 'unknown'
          };
        });
        console.log('Orphan types:', orphanTypes);
      }
      
      expect(orphans).toMatchSnapshot();
    });
    
    it('should handle graph with no orphans', () => {
      const connectedGraph: JsonLdGraph = [
        { '@id': 'root', 'child': { '@id': 'a' } },
        { '@id': 'a', 'child': { '@id': 'b' } },
        { '@id': 'b', 'parent': { '@id': 'a' } }
      ];
      
      const orphans = findOrphans(connectedGraph);
      // Only 'root' should be an orphan since nothing references it
      expect(orphans).toEqual(['root']);
    });
    
    it('should find multiple orphans in test graph', () => {
      const testGraph: JsonLdGraph = [
        { '@id': 'orphan1', '@type': 'Thing' },
        { '@id': 'orphan2', '@type': 'Thing' },
        { '@id': 'parent', 'child': { '@id': 'child' } },
        { '@id': 'child', '@type': 'Thing' }
      ];
      
      const orphans = findOrphans(testGraph);
      // orphan1, orphan2, and parent should be orphans
      expect(orphans).toEqual(['orphan1', 'orphan2', 'parent']);
    });
  });
});