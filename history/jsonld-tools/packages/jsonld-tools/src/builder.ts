/**
 * JSON-LD Builder with fluent interface
 *
 * Provides a mutable builder that applies configurations and processes graphs.
 * Supports runtime overrides and maintains the complex filtering logic from
 * the current head-manager system.
 */

import { JsonLdConfigBuilder } from './config';
import { extractSubgraphs, filterGraphProperties, type JsonLdGraph } from './jsonld-utils';
import type { BuildOptions, JsonLdConfig } from './types';
import {
  applyPopulateConfig,
  buildPropertyFilterConfig,
  filterJsonLdGraph,
  validateRuntimeConfig,
} from './builder-utils';

/**
 * Mutable builder class that extends config builder with automatic method delegation
 */
export class JsonLdBuilder extends JsonLdConfigBuilder {
  private currentGraph?: JsonLdGraph;

  constructor(initialConfig: JsonLdConfig = {}) {
    super(initialConfig);
  }

  /**
   * Override the config builder's method creation to return JsonLdBuilder instances
   */
  protected createInstance(config: JsonLdConfig): JsonLdBuilder {
    return new JsonLdBuilder(config);
  }

  /**
   * Get the current graph state (processes the graph if not already done)
   */
  getCurrentGraph(): JsonLdGraph {
    if (!this.currentGraph) {
      this.currentGraph = this.processGraph();
    }
    return this.currentGraph;
  }

  /**
   * Build the final JSON-LD output
   * @param options - Build configuration options
   * @param options.prettyPrint - Whether to format JSON with indentation (default: true)
   * @param options.contextUrl - The JSON-LD context URL (default: 'https://schema.org')
   * @param options.withScriptTag - Whether to wrap output in a script tag (default: false)
   * @param options.scriptId - Optional ID attribute for the script tag
   * @returns The JSON-LD string, optionally wrapped in a script tag
   */
  build(options: BuildOptions = {}): string {
    const {
      prettyPrint = true,
      contextUrl = 'https://schema.org',
      withScriptTag = false,
      scriptId,
    } = options;

    const graph = this.getCurrentGraph();

    // Create the JSON-LD object
    const jsonLd = {
      '@context': contextUrl,
      '@graph': graph,
    };

    // Stringify with optional pretty printing
    const jsonString = JSON.stringify(jsonLd, null, prettyPrint ? 2 : undefined);

    // Wrap in script tag if requested
    if (withScriptTag) {
      const idAttribute = scriptId ? ` id="${scriptId}"` : '';
      return `<script${idAttribute} type="application/ld+json">${jsonString}</script>`;
    }

    return jsonString;
  }

  /**
   * Process the graph according to the current configuration
   * This implements the critical filtering logic from the current manager
   */
  private processGraph(): JsonLdGraph {
    const config = this.getConfig();

    if (!config.baseGraph) {
      throw new Error('No base graph provided. Use baseGraph() or mergeConfig() with a baseGraph.');
    }

    // Validate configuration - only check for critical errors that would break processing
    const errors = validateRuntimeConfig(config);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    let graph = [...config.baseGraph];
    const propertyFilters = buildPropertyFilterConfig(config);
    let propertyFiltersApplied = false;

    // Layer 1: Subgraph extraction with property filtering if subgraphRoots are set
    if (config.filters?.subgraphRoots && config.filters.subgraphRoots.length > 0) {
      // Extract subgraph with property filtering during traversal
      graph = extractSubgraphs(graph, config.filters.subgraphRoots, propertyFilters);
      propertyFiltersApplied = true; // Property filters were applied during subgraph extraction
    }

    // Layer 2: Regular entity filtering with property filtering if not already applied
    if (config.filters) {
      // Apply property filters first if they haven't been applied yet
      if (!propertyFiltersApplied && propertyFilters) {
        graph = filterGraphProperties(graph, propertyFilters);
        propertyFiltersApplied = true;
      }

      // Apply entity-level filters
      graph = filterJsonLdGraph(graph, config.filters);
    }

    // Apply entity population if configured
    if (config.populateConfig) {
      graph = applyPopulateConfig(graph, config.populateConfig);
    }

    // Add additional entities if specified
    if (config.additionalEntities && config.additionalEntities.length > 0) {
      graph = [...graph, ...config.additionalEntities];
    }

    // Apply custom transformation pipes
    if (config.pipes && config.pipes.length > 0) {
      for (const pipe of config.pipes) {
        graph = pipe(graph);
      }
    }

    return graph;
  }
}

/**
 * Factory function to create a new builder
 */
export function createJsonLdBuilder(): JsonLdBuilder {
  return new JsonLdBuilder();
}
