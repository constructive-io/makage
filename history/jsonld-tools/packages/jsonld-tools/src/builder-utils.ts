/**
 * Utility functions for JSON-LD builder
 *
 * Provides configuration merging, validation, and transformation utilities
 * for the JSON-LD builder system.
 */

import type {
  JsonLdEntity,
  JsonLdGraph,
  PropertyFilterConfig,
  PropertyFilterRule,
} from './jsonld-utils';
import type {
  JsonLdConfig,
  JsonLdFilterOptions,
  PopulateConfig,
  PropertyFilterByIdRule,
  PropertyFilterByTypeRule,
} from './types';

/**
 * Merge two configurations, with the second taking precedence
 */
export function mergeConfigs(base: JsonLdConfig, override: JsonLdConfig): JsonLdConfig {
  return {
    // Base graph: override takes precedence
    baseGraph: override.baseGraph ?? base.baseGraph,

    // Filters: merge filter options
    filters: mergeFilterOptions(base.filters, override.filters),

    // Additional entities: combine arrays
    additionalEntities: combineArrays(base.additionalEntities, override.additionalEntities),

    // Pipes: combine arrays
    pipes: combineArrays(base.pipes, override.pipes),

    // Populate config: override takes precedence
    populateConfig: override.populateConfig ?? base.populateConfig,
  };
}

/**
 * Merge filter options, merging arrays and using override for single values
 */
export function mergeFilterOptions(
  base?: JsonLdFilterOptions,
  override?: JsonLdFilterOptions
): JsonLdFilterOptions | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;

  return {
    // Merge arrays instead of replacing
    includeTypes: combineArrays(base.includeTypes, override.includeTypes),
    excludeTypes: combineArrays(base.excludeTypes, override.excludeTypes),
    includeIds: combineArrays(base.includeIds, override.includeIds),
    excludeIds: combineArrays(base.excludeIds, override.excludeIds),
    requiredProperties: combineArrays(base.requiredProperties, override.requiredProperties),
    excludeEntitiesWithProperties: combineArrays(
      base.excludeEntitiesWithProperties,
      override.excludeEntitiesWithProperties
    ),
    subgraphRoots: combineArrays(base.subgraphRoots, override.subgraphRoots),
    propertyFilters: combinePropertyFilters(base.propertyFilters, override.propertyFilters),
    propertyFiltersByIds: combineArrays(base.propertyFiltersByIds, override.propertyFiltersByIds),
    propertyFiltersByTypes: combineArrays(
      base.propertyFiltersByTypes,
      override.propertyFiltersByTypes
    ),

    // Single values - override takes precedence
    customFilter: override.customFilter ?? base.customFilter,
    maxEntities: override.maxEntities ?? base.maxEntities,
  };
}

/**
 * Combine property filter configurations
 */
function combinePropertyFilters(
  base?: PropertyFilterConfig,
  override?: PropertyFilterConfig
): PropertyFilterConfig | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;
  return [...base, ...override];
}

/**
 * Combine arrays, handling undefined values
 */
function combineArrays<T>(base?: T[], override?: T[]): T[] | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;
  return [...base, ...override];
}

/**
 * Convert property filter by ID rules to PropertyFilterConfig
 */
export function convertPropertyFiltersByIds(rules: PropertyFilterByIdRule[]): PropertyFilterRule[] {
  return rules.flatMap((rule) =>
    rule.entityIds.map((entityId) => ({
      selector: { '@id': entityId },
      include: rule.include,
      exclude: rule.exclude,
    }))
  );
}

/**
 * Convert property filter by type rules to PropertyFilterConfig
 */
export function convertPropertyFiltersByTypes(
  rules: PropertyFilterByTypeRule[]
): PropertyFilterRule[] {
  return rules.flatMap((rule) =>
    rule.entityTypes.map((entityType) => ({
      selector: { '@type': entityType },
      include: rule.include,
      exclude: rule.exclude,
    }))
  );
}

/**
 * Build complete property filter configuration from all sources
 */
export function buildPropertyFilterConfig(config: JsonLdConfig): PropertyFilterConfig | undefined {
  const filters: PropertyFilterRule[] = [];

  // Add base property filters
  if (config.filters?.propertyFilters) {
    filters.push(...config.filters.propertyFilters);
  }

  // Add property filters by IDs
  if (config.filters?.propertyFiltersByIds) {
    filters.push(...convertPropertyFiltersByIds(config.filters.propertyFiltersByIds));
  }

  // Add property filters by types
  if (config.filters?.propertyFiltersByTypes) {
    filters.push(...convertPropertyFiltersByTypes(config.filters.propertyFiltersByTypes));
  }

  return filters.length > 0 ? filters : undefined;
}

/**
 * Validate configuration for common issues
 */
export function validateConfig(config: JsonLdConfig): string[] {
  const errors: string[] = [];

  // Check for conflicting include/exclude types
  if (config.filters?.includeTypes && config.filters?.excludeTypes) {
    const overlap = config.filters.includeTypes.filter((type) =>
      config.filters!.excludeTypes!.includes(type)
    );
    if (overlap.length > 0) {
      errors.push(`Conflicting include/exclude types: ${overlap.join(', ')}`);
    }
  }

  // Check for conflicting include/exclude IDs
  if (config.filters?.includeIds && config.filters?.excludeIds) {
    const overlap = config.filters.includeIds.filter((id) =>
      config.filters!.excludeIds!.includes(id)
    );
    if (overlap.length > 0) {
      errors.push(`Conflicting include/exclude IDs: ${overlap.join(', ')}`);
    }
  }

  // Check for invalid maxEntities
  if (config.filters?.maxEntities !== undefined && config.filters.maxEntities < 1) {
    errors.push('maxEntities must be greater than 0');
  }

  return errors;
}

/**
 * Apply populate configuration to entities in the graph
 */
export function applyPopulateConfig(
  graph: JsonLdGraph,
  populateConfig: PopulateConfig
): JsonLdGraph {
  return graph.map((entity) => {
    const entityId = entity['@id'];
    const populateRules = populateConfig[entityId];

    if (!populateRules || populateRules.length === 0) {
      return entity;
    }

    // Create a copy of the entity to avoid mutation
    const populatedEntity = { ...entity };

    // Apply each populate rule
    for (const rule of populateRules) {
      populatedEntity[rule.property] = rule.entities;
    }

    return populatedEntity;
  });
}

/**
 * Validate runtime configuration for critical errors only
 * This is more lenient than the general validateConfig to handle runtime overrides
 */
export function validateRuntimeConfig(config: JsonLdConfig): string[] {
  const errors: string[] = [];

  // Check for baseGraph requirement
  if (!config.baseGraph) {
    errors.push('baseGraph is required');
  } else if (!Array.isArray(config.baseGraph)) {
    errors.push('baseGraph must be an array');
  }

  // Only check for critical errors that would break processing
  if (config.filters?.maxEntities !== undefined && config.filters.maxEntities < 1) {
    errors.push('maxEntities must be greater than 0');
  }

  return errors;
}

/**
 * Type guard to check if an entity matches a type
 */
export function entityHasType(entity: JsonLdEntity, type: string): boolean {
  const entityType = entity['@type'];
  if (!entityType) return false;

  if (Array.isArray(entityType)) {
    return entityType.includes(type);
  }

  return entityType === type;
}

/**
 * Type guard to check if an entity has any of the specified types
 */
export function entityHasAnyType(entity: JsonLdEntity, types: string[]): boolean {
  return types.some((type) => entityHasType(entity, type));
}

/**
 * Get all types from an entity as an array
 */
export function getEntityTypes(entity: JsonLdEntity): string[] {
  const entityType = entity['@type'];
  if (!entityType) return [];

  return Array.isArray(entityType) ? entityType : [entityType];
}

/**
 * Apply filters to a JSON-LD graph (copied from head-manager/filters.ts for self-containment)
 */
export function filterJsonLdGraph(graph: JsonLdGraph, options: JsonLdFilterOptions): JsonLdGraph {
  let filtered = [...graph];

  // Apply type inclusion filter
  if (options.includeTypes && options.includeTypes.length > 0) {
    filtered = filtered.filter((entity) => {
      const type = entity['@type'];
      if (!type) return false;

      const types = Array.isArray(type) ? type : [type];
      return types.some((t) => options.includeTypes!.includes(t));
    });
  }

  // Apply type exclusion filter
  if (options.excludeTypes && options.excludeTypes.length > 0) {
    filtered = filtered.filter((entity) => {
      const type = entity['@type'];
      if (!type) return true;

      const types = Array.isArray(type) ? type : [type];
      return !types.some((t) => options.excludeTypes!.includes(t));
    });
  }

  // Apply ID inclusion filter
  if (options.includeIds && options.includeIds.length > 0) {
    filtered = filtered.filter(
      (entity) => entity['@id'] && options.includeIds!.includes(entity['@id'])
    );
  }

  // Apply ID exclusion filter
  if (options.excludeIds && options.excludeIds.length > 0) {
    filtered = filtered.filter(
      (entity) => !entity['@id'] || !options.excludeIds!.includes(entity['@id'])
    );
  }

  // Apply required properties filter
  if (options.requiredProperties && options.requiredProperties.length > 0) {
    filtered = filtered.filter((entity) =>
      options.requiredProperties!.every((prop) => prop in entity)
    );
  }

  // Apply excluded properties filter (handle both old and new property names)
  const excludeProps = options.excludeEntitiesWithProperties || (options as any).excludeProperties;
  if (excludeProps && excludeProps.length > 0) {
    filtered = filtered.filter((entity) => !excludeProps.some((prop: string) => prop in entity));
  }

  // Apply custom filter
  if (options.customFilter) {
    filtered = filtered.filter(options.customFilter);
  }

  // Apply max entities limit
  if (options.maxEntities && options.maxEntities > 0) {
    filtered = filtered.slice(0, options.maxEntities);
  }

  return filtered;
}
