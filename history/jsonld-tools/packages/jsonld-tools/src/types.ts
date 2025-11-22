/**
 * Types for the JSON-LD Builder API
 *
 * Provides comprehensive type definitions for the fluent builder interface
 * that maintains compatibility with existing filtering logic while adding
 * new configuration-first approach.
 */

// Import and re-export core types from local jsonld utils
import type {
  JsonLdEntity,
  JsonLdGraph,
  PropertyFilterConfig,
  PropertyFilterRule,
} from './jsonld-utils';

export type { JsonLdEntity, JsonLdGraph, PropertyFilterConfig, PropertyFilterRule };

/**
 * Filter function type for JSON-LD entities
 */
export type JsonLdFilter = (entity: JsonLdEntity) => boolean;

/**
 * Updated filter options with renamed properties for clarity
 */
export interface JsonLdFilterOptions {
  /** Include only these entity types */
  includeTypes?: string[];

  /** Exclude these entity types */
  excludeTypes?: string[];

  /** Include only entities with these IDs */
  includeIds?: string[];

  /** Exclude entities with these IDs */
  excludeIds?: string[];

  /** Custom filter function */
  customFilter?: JsonLdFilter;

  /** Maximum number of entities to include */
  maxEntities?: number;

  /** Include only entities with specific properties */
  requiredProperties?: string[];

  /** Exclude entities with specific properties (renamed from excludeProperties) */
  excludeEntitiesWithProperties?: string[];

  /** Root IDs for subgraph extraction */
  subgraphRoots?: string[];

  /** Property-level filtering configuration */
  propertyFilters?: PropertyFilterConfig;

  /** Property filtering rules by entity IDs */
  propertyFiltersByIds?: PropertyFilterByIdRule[];

  /** Property filtering rules by entity types */
  propertyFiltersByTypes?: PropertyFilterByTypeRule[];
}

/**
 * Configuration for property filtering by entity IDs
 */
export interface PropertyFilterByIdRule {
  /** Entity IDs to apply this rule to */
  entityIds: string[];
  /** Properties to include (if specified, only these are included) */
  include?: string[];
  /** Properties to exclude */
  exclude?: string[];
}

/**
 * Configuration for property filtering by entity types
 */
export interface PropertyFilterByTypeRule {
  /** Entity types to apply this rule to */
  entityTypes: string[];
  /** Properties to include (if specified, only these are included) */
  include?: string[];
  /** Properties to exclude */
  exclude?: string[];
}

export interface PopulateProperty {
  property: string;
  entities: JsonLdEntity[];
}

export interface PopulateConfig {
  [entityId: string]: PopulateProperty[];
}

/**
 * Immutable configuration state for JSON-LD processing
 */
export interface JsonLdConfig {
  /** Base graph to process */
  baseGraph?: JsonLdGraph;

  /** Entity filtering options */
  filters?: JsonLdFilterOptions;

  /** Additional entities to include */
  additionalEntities?: JsonLdEntity[];

  /** Custom transformation functions */
  pipes?: PipeFunction[];

  /** Populate configuration (contains data to populate) */
  populateConfig?: PopulateConfig;
}

/**
 * Options for the build() method
 */
export interface BuildOptions {
  /** Whether to pretty-print the JSON output */
  prettyPrint?: boolean;

  /** Custom context URL (defaults to 'https://schema.org') */
  contextUrl?: string;

  /** Whether to wrap output in a script tag */
  withScriptTag?: boolean;

  /** ID for the script tag (only used if withScriptTag is true) */
  scriptId?: string;
}

/**
 * Custom transformation function type
 */
export type PipeFunction = (graph: JsonLdGraph) => JsonLdGraph;

/**
 * Configuration builder interface (immutable operations)
 */
export interface IJsonLdConfigBuilder {
  /** Set the base graph to process */
  baseGraph(graph: JsonLdGraph): this;

  /** Include only entities with these IDs */
  includeIds(ids: string[]): this;

  /** Exclude entities with these IDs */
  excludeIds(ids: string[]): this;

  /** Include only these entity types */
  includeTypes(types: string[]): this;

  /** Exclude these entity types */
  excludeTypes(types: string[]): this;

  /** Apply custom filter function */
  customFilter(fn: JsonLdFilter): this;

  /** Limit maximum number of entities */
  maxEntities(max: number): this;

  /** Include only entities with these properties */
  requiredProperties(props: string[]): this;

  /** Exclude entities with these properties */
  excludeEntitiesWithProperties(props: string[]): this;

  /** Extract subgraph starting from these root IDs */
  subgraph(rootIds: string[]): this;

  /** Filter properties for specific entity IDs */
  filterPropertiesByIds(
    entityIds: string[],
    rule: { include?: string[]; exclude?: string[] }
  ): this;

  /** Filter properties for specific entity types */
  filterPropertiesByTypes(
    entityTypes: string[],
    rule: { include?: string[]; exclude?: string[] }
  ): this;

  /** Add additional entities */
  addEntities(entities: JsonLdEntity[]): this;

  /** Add custom transformation pipe */
  pipe(fn: PipeFunction): this;

  /** Configure entity population */
  populateEntities(entityIds: string[], populateConfig: PopulateConfig): this;

  /** Clear both includeIds and excludeIds */
  clearIds(): this;

  /** Clear both includeTypes and excludeTypes */
  clearTypes(): this;

  /** Clear both requiredProperties and excludeEntitiesWithProperties */
  clearPropertyRequirements(): this;

  /** Clear both propertyFiltersByIds and propertyFiltersByTypes */
  clearPropertyFilters(): this;

  /** Clear subgraphRoots */
  clearSubgraph(): this;

  /** Clear entire configuration except baseGraph */
  clearAll(): this;

  /** Merge with another configuration */
  mergeConfig(config: JsonLdConfig): this;

  /** Merge only the filters part of another configuration */
  mergeFilters(filters: JsonLdFilterOptions): this;

  /** Get the current configuration */
  getConfig(): JsonLdConfig;
}
