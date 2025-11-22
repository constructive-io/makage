import {
  extractSubgraphs,
  filterEntityProperties,
  filterGraphProperties,
  matchesSelector,
  type JsonLdEntity,
  type PropertyFilterConfig,
} from '../../src/jsonld-utils';

describe('Property Filtering', () => {
  // Mock entities for testing
  const mockEntities: JsonLdEntity[] = [
    {
      '@id': 'person:danlynch',
      '@type': 'Person',
      name: 'Dan Lynch',
      jobTitle: 'CEO',
      image: 'dan.jpg',
      bio: 'Founder of Hyperweb',
      worksFor: { '@id': 'org:hyperweb' },
      sameAs: ['https://github.com/pyramation'],
      'x-internal': 'secret',
    },
    {
      '@id': 'org:hyperweb',
      '@type': 'Organization',
      name: 'Hyperweb',
      url: 'https://hyperweb.io',
      logo: 'hyperweb-logo.png',
      subjectOf: [{ '@id': 'article:hyperweb-intro' }],
      'x-priority': 1,
    },
    {
      '@id': 'software:telescope',
      '@type': 'SoftwareApplication',
      name: 'Telescope',
      description: 'TypeScript code generator',
      programmingLanguage: 'TypeScript',
      applicationCategory: 'codegen',
      contributor: { '@id': 'person:danlynch' },
      image: 'telescope.png',
    },
  ];

  describe('matchesSelector', () => {
    const person = mockEntities[0];
    const org = mockEntities[1];
    const software = mockEntities[2];

    test('global selector matches everything', () => {
      expect(matchesSelector(person, '*')).toBe(true);
      expect(matchesSelector(org, '*')).toBe(true);
      expect(matchesSelector(software, '*')).toBe(true);
    });

    test('empty object selector matches everything', () => {
      expect(matchesSelector(person, {})).toBe(true);
      expect(matchesSelector(org, {})).toBe(true);
      expect(matchesSelector(software, {})).toBe(true);
    });

    test('type-based selector', () => {
      expect(matchesSelector(person, { '@type': 'Person' })).toBe(true);
      expect(matchesSelector(org, { '@type': 'Person' })).toBe(false);
      expect(matchesSelector(org, { '@type': 'Organization' })).toBe(true);
    });

    test('ID-based selector', () => {
      expect(matchesSelector(person, { '@id': 'person:danlynch' })).toBe(true);
      expect(matchesSelector(person, { '@id': 'org:hyperweb' })).toBe(false);
      expect(matchesSelector(org, { '@id': 'org:hyperweb' })).toBe(true);
    });

    test('multi-criteria selector', () => {
      expect(
        matchesSelector(software, {
          '@type': 'SoftwareApplication',
          programmingLanguage: 'TypeScript',
        })
      ).toBe(true);
      expect(
        matchesSelector(software, {
          '@type': 'SoftwareApplication',
          programmingLanguage: 'JavaScript',
        })
      ).toBe(false);
    });

    test('array value matching', () => {
      expect(matchesSelector(person, { sameAs: 'https://github.com/pyramation' })).toBe(true);
      expect(matchesSelector(person, { sameAs: 'https://twitter.com/pyramation' })).toBe(false);
    });

    test('object reference matching', () => {
      expect(matchesSelector(person, { worksFor: { '@id': 'org:hyperweb' } })).toBe(true);
      expect(matchesSelector(person, { worksFor: { '@id': 'org:other' } })).toBe(false);
      expect(matchesSelector(software, { contributor: { '@id': 'person:danlynch' } })).toBe(true);
    });
  });

  describe('filterEntityProperties', () => {
    const person = mockEntities[0];

    test('include-only rules', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          include: ['@id', '@type', 'name', 'jobTitle'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual({
        '@id': 'person:danlynch',
        '@type': 'Person',
        name: 'Dan Lynch',
        jobTitle: 'CEO',
      });
    });

    test('exclude-only rules', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          exclude: ['x-internal', 'bio', 'image'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual({
        '@id': 'person:danlynch',
        '@type': 'Person',
        name: 'Dan Lynch',
        jobTitle: 'CEO',
        worksFor: { '@id': 'org:hyperweb' },
        sameAs: ['https://github.com/pyramation'],
      });
    });

    test('include + exclude (exclude takes precedence)', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          include: ['@id', '@type', 'name', 'jobTitle', 'x-internal'],
          exclude: ['x-internal'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual({
        '@id': 'person:danlynch',
        '@type': 'Person',
        name: 'Dan Lynch',
        jobTitle: 'CEO',
      });
    });

    test('multiple rules with different selectors', () => {
      const config: PropertyFilterConfig = [
        {
          selector: { '@type': 'Person' },
          exclude: ['x-internal'],
        },
        {
          selector: { '@id': 'person:danlynch' },
          exclude: ['bio'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual({
        '@id': 'person:danlynch',
        '@type': 'Person',
        name: 'Dan Lynch',
        jobTitle: 'CEO',
        image: 'dan.jpg',
        worksFor: { '@id': 'org:hyperweb' },
        sameAs: ['https://github.com/pyramation'],
      });
    });

    test('rule precedence (later rules override earlier ones)', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          include: ['@id', '@type', 'name'],
        },
        {
          selector: { '@type': 'Person' },
          include: ['@id', '@type', 'name', 'jobTitle'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual({
        '@id': 'person:danlynch',
        '@type': 'Person',
        name: 'Dan Lynch',
        jobTitle: 'CEO',
      });
    });

    test('non-matching selector leaves entity unchanged', () => {
      const config: PropertyFilterConfig = [
        {
          selector: { '@type': 'Organization' },
          exclude: ['subjectOf'],
        },
      ];

      const result = filterEntityProperties(person, config);
      expect(result).toEqual(person);
    });
  });

  describe('filterGraphProperties', () => {
    test('filter entire graph with multiple rules', () => {
      const config: PropertyFilterConfig = [
        {
          selector: { '@id': 'org:hyperweb' },
          exclude: ['subjectOf'],
        },
        {
          selector: { '@type': 'Person' },
          exclude: ['x-internal', 'bio'],
        },
      ];

      const result = filterGraphProperties(mockEntities, config);

      // Check org:hyperweb has subjectOf removed
      const org = result.find((e) => e['@id'] === 'org:hyperweb');
      expect(org).toBeDefined();
      expect(org!.subjectOf).toBeUndefined();
      expect(org!.name).toBe('Hyperweb');

      // Check person has x-internal and bio removed
      const person = result.find((e) => e['@id'] === 'person:danlynch');
      expect(person).toBeDefined();
      expect(person!['x-internal']).toBeUndefined();
      expect(person!.bio).toBeUndefined();
      expect(person!.name).toBe('Dan Lynch');

      // Check software is unchanged
      const software = result.find((e) => e['@id'] === 'software:telescope');
      expect(software).toBeDefined();
      expect(software!.name).toBe('Telescope');
    });

    test('preserve entity structure and references', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          exclude: ['image'],
        },
      ];

      const result = filterGraphProperties(mockEntities, config);

      // Check references are preserved
      const person = result.find((e) => e['@id'] === 'person:danlynch');
      expect(person!.worksFor).toEqual({ '@id': 'org:hyperweb' });

      const software = result.find((e) => e['@id'] === 'software:telescope');
      expect(software!.contributor).toEqual({ '@id': 'person:danlynch' });

      // Check images are removed
      expect(person!.image).toBeUndefined();
      expect(software!.image).toBeUndefined();
    });

    test('handle missing properties gracefully', () => {
      const config: PropertyFilterConfig = [
        {
          selector: '*',
          include: ['@id', '@type', 'nonExistentProperty'],
        },
      ];

      const result = filterGraphProperties(mockEntities, config);

      result.forEach((entity) => {
        expect(entity['@id']).toBeDefined();
        expect(entity['@type']).toBeDefined();
        expect(entity.nonExistentProperty).toBeUndefined();
      });
    });
  });

  describe('extractSubgraphs with property filtering', () => {
    test('property filtering before reference traversal', () => {
      const config: PropertyFilterConfig = [
        {
          selector: { '@id': 'person:danlynch' },
          exclude: ['worksFor'], // Remove the reference to org:hyperweb
        },
      ];

      const result = extractSubgraphs(mockEntities, ['person:danlynch'], config);

      // Should only include person:danlynch since worksFor reference was removed
      expect(result).toHaveLength(1);
      expect(result[0]['@id']).toBe('person:danlynch');
      expect(result[0].worksFor).toBeUndefined();
    });

    test('verify only surviving references are followed', () => {
      const config: PropertyFilterConfig = [
        {
          selector: { '@id': 'org:hyperweb' },
          exclude: ['subjectOf'], // Remove reference to article
        },
      ];

      const result = extractSubgraphs(mockEntities, ['org:hyperweb'], config);

      // Should only include org:hyperweb, not the article it would reference
      expect(result).toHaveLength(1);
      expect(result[0]['@id']).toBe('org:hyperweb');
      expect(result[0].subjectOf).toBeUndefined();
    });

    test('compare with standard subgraph extraction', () => {
      // Without property filtering - should follow all references
      const standardResult = extractSubgraphs(mockEntities, ['person:danlynch']);

      // With property filtering - remove worksFor reference
      const config: PropertyFilterConfig = [
        {
          selector: { '@id': 'person:danlynch' },
          exclude: ['worksFor'],
        },
      ];
      const filteredResult = extractSubgraphs(mockEntities, ['person:danlynch'], config);

      // Standard should include both person and org
      expect(standardResult.length).toBeGreaterThan(filteredResult.length);

      // Filtered should only include person
      expect(filteredResult).toHaveLength(1);
      expect(filteredResult[0]['@id']).toBe('person:danlynch');
    });

    test('efficient per-entity filtering during traversal', () => {
      // Create a larger graph with unreachable entities
      const largeGraph: JsonLdEntity[] = [
        ...mockEntities,
        // Add many unreachable entities
        ...Array.from({ length: 100 }, (_, i) => ({
          '@id': `unreachable:${i}`,
          '@type': 'Thing',
          name: `Unreachable ${i}`,
          someProperty: 'should not be filtered',
        })),
      ];

      const config: PropertyFilterConfig = [
        {
          selector: '*',
          exclude: ['someProperty'], // This would filter all entities if applied globally
        },
      ];

      const result = extractSubgraphs(largeGraph, ['person:danlynch'], config);

      // Should only include reachable entities (person + org)
      // Unreachable entities should not be processed at all
      expect(result).toHaveLength(2);
      expect(result.map((e) => e['@id']).sort()).toEqual(['org:hyperweb', 'person:danlynch']);

      // Verify that the filtering was applied to reached entities
      const person = result.find((e) => e['@id'] === 'person:danlynch');
      expect(person?.someProperty).toBeUndefined(); // Should be filtered if it existed
    });
  });
});
