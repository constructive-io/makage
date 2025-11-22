export { createJsonLdConfig, JsonLdConfigBuilder } from './config';
export { createJsonLdBuilder, JsonLdBuilder } from './builder';

export type { JsonLdConfig, JsonLdFilterOptions, BuildOptions, PopulateConfig } from './types';

export {
  type JsonLdEntity,
  type JsonLdGraph,
  extractReferences,
  extractSubgraph,
  extractSubgraphWithDepth,
  extractSubgraphs,
  filterEntityProperties,
  filterGraphProperties,
  findEntities,
  findEntitiesByType,
  findEntity,
  findMissingReferences,
  findNestedEntities,
  findOrphans,
  findReferencingEntities,
  inlineReferences,
} from './jsonld-utils';

export { filterJsonLdGraph } from './builder-utils';
