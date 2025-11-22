/**
 * Immutable configuration builder for JSON-LD processing
 *
 * Provides a fluent interface for building configurations without
 * performing any graph processing. Each method returns a new
 * configuration object for safe reuse and extension.
 */

import type {
  IJsonLdConfigBuilder,
  JsonLdConfig,
  JsonLdEntity,
  JsonLdFilter,
  JsonLdFilterOptions,
  JsonLdGraph,
  PipeFunction,
  PopulateConfig,
  PropertyFilterByIdRule,
  PropertyFilterByTypeRule,
} from './types';
import { mergeConfigs, mergeFilterOptions } from './builder-utils';

/**
 * Immutable configuration builder class
 */
export class JsonLdConfigBuilder implements IJsonLdConfigBuilder {
  private config: JsonLdConfig;

  constructor(initialConfig: JsonLdConfig = {}) {
    this.config = { ...initialConfig };
  }

  /**
   * Create a new instance of this class (can be overridden by subclasses)
   */
  protected createInstance(config: JsonLdConfig): JsonLdConfigBuilder {
    return new JsonLdConfigBuilder(config);
  }

  /**
   * Set the base graph to process
   */
  baseGraph(graph: JsonLdGraph): this {
    return this.createInstance({
      ...this.config,
      baseGraph: graph,
    }) as this;
  }

  /**
   * Include only entities with these IDs (merges with existing IDs)
   */
  includeIds(ids: string[]): this {
    const existingIds = this.config.filters?.includeIds || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        includeIds: [...existingIds, ...ids],
      },
    }) as this;
  }

  /**
   * Exclude entities with these IDs (merges with existing IDs)
   */
  excludeIds(ids: string[]): this {
    const existingIds = this.config.filters?.excludeIds || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        excludeIds: [...existingIds, ...ids],
      },
    }) as this;
  }

  /**
   * Include only these entity types (merges with existing types)
   */
  includeTypes(types: string[]): this {
    const existingTypes = this.config.filters?.includeTypes || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        includeTypes: [...existingTypes, ...types],
      },
    }) as this;
  }

  /**
   * Exclude these entity types (merges with existing types)
   */
  excludeTypes(types: string[]): this {
    const existingTypes = this.config.filters?.excludeTypes || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        excludeTypes: [...existingTypes, ...types],
      },
    }) as this;
  }

  /**
   * Apply custom filter function
   */
  customFilter(fn: JsonLdFilter): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        customFilter: fn,
      },
    }) as this;
  }

  /**
   * Limit maximum number of entities
   */
  maxEntities(max: number): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        maxEntities: max,
      },
    }) as this;
  }

  /**
   * Include only entities with these properties (merges with existing properties)
   * @param props - Array of property names that entities must have
   * @example
   * ```typescript
   * config.requiredProperties(['name']).requiredProperties(['url'])
   * // Result: entities must have both 'name' and 'url' properties
   * ```
   */
  requiredProperties(props: string[]): this {
    const existingProps = this.config.filters?.requiredProperties || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        requiredProperties: [...existingProps, ...props],
      },
    }) as this;
  }

  /**
   * Exclude entities with these properties (merges with existing properties)
   */
  excludeEntitiesWithProperties(props: string[]): this {
    const existingProps = this.config.filters?.excludeEntitiesWithProperties || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        excludeEntitiesWithProperties: [...existingProps, ...props],
      },
    }) as this;
  }

  /**
   * Extract subgraph starting from these root IDs
   */
  subgraph(rootIds: string[]): this {
    const existingRoots = this.config.filters?.subgraphRoots || [];
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        subgraphRoots: [...existingRoots, ...rootIds],
      },
    }) as this;
  }

  /**
   * Filter properties for specific entity IDs
   */
  filterPropertiesByIds(
    entityIds: string[],
    rule: { include?: string[]; exclude?: string[] }
  ): this {
    const existingRules = this.config.filters?.propertyFiltersByIds || [];
    const newRule: PropertyFilterByIdRule = {
      entityIds,
      ...rule,
    };

    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        propertyFiltersByIds: [...existingRules, newRule],
      },
    }) as this;
  }

  /**
   * Filter properties for specific entity types
   */
  filterPropertiesByTypes(
    entityTypes: string[],
    rule: { include?: string[]; exclude?: string[] }
  ): this {
    const existingRules = this.config.filters?.propertyFiltersByTypes || [];
    const newRule: PropertyFilterByTypeRule = {
      entityTypes,
      ...rule,
    };

    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        propertyFiltersByTypes: [...existingRules, newRule],
      },
    }) as this;
  }

  /**
   * Add additional entities
   */
  addEntities(entities: JsonLdEntity[]): this {
    const existingEntities = this.config.additionalEntities || [];
    return this.createInstance({
      ...this.config,
      additionalEntities: [...existingEntities, ...entities],
    }) as this;
  }

  /**
   * Add custom transformation pipe
   */
  pipe(fn: PipeFunction): this {
    const existingPipes = this.config.pipes || [];
    return this.createInstance({
      ...this.config,
      pipes: [...existingPipes, fn],
    }) as this;
  }

  /**
   * Configure entity population
   */
  populateEntities(entityIds: string[], populateConfig: PopulateConfig): this {
    // Merge with existing populate config
    const existingPopulateConfig = this.config.populateConfig || {};
    const mergedPopulateConfig = { ...existingPopulateConfig };

    // Add the new populate config for the specified entity IDs
    for (const entityId of entityIds) {
      if (populateConfig[entityId]) {
        mergedPopulateConfig[entityId] = populateConfig[entityId];
      }
    }

    return this.createInstance({
      ...this.config,
      populateConfig: mergedPopulateConfig,
    }) as this;
  }

  /**
   * Clear both includeIds and excludeIds
   * @example
   * ```typescript
   * config.includeIds(['a']).excludeIds(['b']).clearIds().includeIds(['c'])
   * // Result: only includes 'c', previous IDs are cleared
   * ```
   */
  clearIds(): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        includeIds: undefined,
        excludeIds: undefined,
      },
    }) as this;
  }

  /**
   * Clear both includeTypes and excludeTypes
   */
  clearTypes(): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        includeTypes: undefined,
        excludeTypes: undefined,
      },
    }) as this;
  }

  /**
   * Clear both requiredProperties and excludeEntitiesWithProperties
   */
  clearPropertyRequirements(): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        requiredProperties: undefined,
        excludeEntitiesWithProperties: undefined,
      },
    }) as this;
  }

  /**
   * Clear both propertyFiltersByIds and propertyFiltersByTypes
   */
  clearPropertyFilters(): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        propertyFiltersByIds: undefined,
        propertyFiltersByTypes: undefined,
      },
    }) as this;
  }

  /**
   * Clear subgraphRoots
   */
  clearSubgraph(): this {
    return this.createInstance({
      ...this.config,
      filters: {
        ...this.config.filters,
        subgraphRoots: undefined,
      },
    }) as this;
  }

  /**
   * Clear entire configuration except baseGraph
   * @example
   * ```typescript
   * config.baseGraph(graph).includeIds(['a']).clearAll().includeTypes(['Person'])
   * // Result: only baseGraph and includeTypes remain
   * ```
   */
  clearAll(): this {
    return this.createInstance({
      baseGraph: this.config.baseGraph,
    }) as this;
  }

  /**
   * Merge with another configuration
   * @param config - Configuration to merge with current configuration
   */
  mergeConfig(config: JsonLdConfig): this {
    const currentConfig = this.getConfig();
    const mergedConfig = mergeConfigs(currentConfig, config);
    return this.createInstance(mergedConfig) as this;
  }

  /**
   * Merge only the filters part of another configuration
   * @param filters - Filter options to merge with current filters
   */
  mergeFilters(filters: JsonLdFilterOptions): this {
    const currentFilters = this.config.filters;
    const mergedFilters = mergeFilterOptions(currentFilters, filters);

    return this.createInstance({
      ...this.config,
      filters: mergedFilters,
    }) as this;
  }

  /**
   * Get the current configuration
   */
  getConfig(): JsonLdConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a new configuration builder
 */
export function createJsonLdConfig(): JsonLdConfigBuilder {
  return new JsonLdConfigBuilder();
}
