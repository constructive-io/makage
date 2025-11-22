# `jsonldjs`

A powerful, generic JSON-LD builder with comprehensive entity and property filtering capabilities. Provides both immutable configuration building and mutable graph processing with a fluent interface.

## Installation

```bash
# Using pnpm (recommended)
pnpm add jsonldjs

# Using npm
npm install jsonldjs

# Using yarn
yarn add jsonldjs
```

## Features

- **Configuration-First Design**: Separate immutable configuration from graph processing for maximum flexibility
- **Fluent Interface**: Chainable methods for building complex filtering logic
- **Property-Level Filtering**: Filter properties by entity IDs or types
- **Subgraph Extraction**: Extract connected subgraphs with reference following
- **Runtime Overrides**: Apply configuration and then override at runtime
- **Type Safety**: Full TypeScript support with proper type inference
- **Extensibility**: Custom pipes and transformation functions

## Quick Start

### Basic Usage

```typescript
import { createJsonLdBuilder } from 'jsonldjs';
import { jsonldGraph } from '@/data/jsonld';

// Simple filtering
const result = createJsonLdBuilder()
  .baseGraph(jsonldGraph)
  .includeTypes(['Organization', 'Person'])
  .excludeTypes(['ImageObject'])
  .maxEntities(10)
  .build({
    prettyPrint: true,
    withScriptTag: true,
    scriptId: 'json-ld',
  });
```

### Configuration-First Approach

```typescript
import { createJsonLdBuilder, createJsonLdConfig } from 'jsonldjs';

// Create reusable configurations
const globalConfig = createJsonLdConfig()
  .baseGraph(jsonldGraph)
  .includeIds(['org:hyperweb', 'website:hyperweb.io'])
  .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] });

// Extend configurations immutably
const homeConfig = globalConfig.excludeTypes(['ImageObject']);
const blogConfig = globalConfig.includeTypes(['Article']);

// Use configurations
const result = createJsonLdBuilder()
  .mergeConfig(homeConfig.getConfig())
  .excludeIds(['runtime:override']) // Runtime overrides
  .build({ prettyPrint: true });
```

## Configuration Merging Behavior

### Default Merging

All configuration methods **merge by default** instead of replacing. This provides predictable behavior across all methods:

```typescript
const config = createJsonLdConfig()
  .includeIds(['a', 'b'])
  .includeIds(['c', 'd']) // Result: ['a', 'b', 'c', 'd']
  .includeTypes(['Person'])
  .includeTypes(['Organization']); // Result: ['Person', 'Organization']
```

### Clear Methods

When you need to replace instead of merge, use the clear methods:

```typescript
const config = createJsonLdConfig()
  .includeIds(['old1', 'old2'])
  .clearIds() // Clear both includeIds and excludeIds
  .includeIds(['new1', 'new2']); // Result: ['new1', 'new2']
```

#### Available Clear Methods

- `clearIds()` - Clears both `includeIds` and `excludeIds`
- `clearTypes()` - Clears both `includeTypes` and `excludeTypes`
- `clearPropertyRequirements()` - Clears both `requiredProperties` and `excludeEntitiesWithProperties`
- `clearPropertyFilters()` - Clears both `propertyFiltersByIds` and `propertyFiltersByTypes`
- `clearSubgraph()` - Clears `subgraphRoots`
- `clearAll()` - Clears entire configuration (except `baseGraph`)

## API Reference

### Factory Functions

#### `createJsonLdConfig()`

Creates a new immutable configuration builder.

```typescript
const config = createJsonLdConfig()
  .baseGraph(graph)
  .includeIds(['org:hyperweb'])
  .excludeTypes(['ImageObject']);
```

#### `createJsonLdBuilder()`

Creates a new builder that extends the configuration builder with graph processing capabilities.

```typescript
const builder = createJsonLdBuilder().baseGraph(graph).mergeConfig(config);
```

### Configuration Methods

All methods are inherited by the builder from the configuration builder:

#### Entity Filtering

- `.includeIds(ids: string[])` - Include entities with these IDs (merges with existing)
- `.excludeIds(ids: string[])` - Exclude entities with these IDs (merges with existing)
- `.includeTypes(types: string[])` - Include these entity types (merges with existing)
- `.excludeTypes(types: string[])` - Exclude these entity types (merges with existing)
- `.customFilter(fn: JsonLdFilter)` - Apply custom filter function
- `.maxEntities(max: number)` - Limit maximum number of entities
- `.requiredProperties(props: string[])` - Include entities with these properties (merges with existing)
- `.excludeEntitiesWithProperties(props: string[])` - Exclude entities with these properties (merges with existing)

#### Clear Methods

- `.clearIds()` - Clear both includeIds and excludeIds
- `.clearTypes()` - Clear both includeTypes and excludeTypes
- `.clearPropertyRequirements()` - Clear both requiredProperties and excludeEntitiesWithProperties
- `.clearPropertyFilters()` - Clear both propertyFiltersByIds and propertyFiltersByTypes
- `.clearSubgraph()` - Clear subgraphRoots
- `.clearAll()` - Clear entire configuration (except baseGraph)

#### Configuration Merging

- `.mergeConfig(config: JsonLdConfig)` - Merge with another complete configuration
- `.mergeFilters(filters: JsonLdFilterOptions)` - Merge only the filters part of another configuration

**Available in both config builder and main builder** - These methods work the same way in both classes.

```typescript
// Config builder usage
const baseConfig = createJsonLdConfig().includeTypes(['Person']);
const otherConfig = createJsonLdConfig()
  .includeTypes(['Organization'])
  .excludeIds(['test'])
  .getConfig();
const merged = baseConfig.mergeConfig(otherConfig);
// Result: includeTypes: ['Person', 'Organization'], excludeIds: ['test']

// Main builder usage (processes graph immediately)
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .includeTypes(['Person'])
  .mergeConfig(otherConfig)
  .build({ prettyPrint: true });

// Merge only filters
const baseConfig = createJsonLdConfig().includeTypes(['Person']).addEntities([entity]);
const otherFilters = { includeTypes: ['Organization'], maxEntities: 10 };
const merged = baseConfig.mergeFilters(otherFilters);
// Result: includeTypes: ['Person', 'Organization'], maxEntities: 10, additionalEntities preserved
```

#### Property Filtering

- `.filterPropertiesByIds(entityIds, rule)` - Filter properties for specific entity IDs
- `.filterPropertiesByTypes(entityTypes, rule)` - Filter properties for specific entity types

```typescript
// Filter properties by entity ID
.filterPropertiesByIds(['org:hyperweb'], {
  exclude: ['subjectOf', 'member']
})

// Filter properties by entity type
.filterPropertiesByTypes(['Article'], {
  include: ['headline', 'author', 'datePublished']
})
```

#### Graph Operations

- `.baseGraph(graph: JsonLdGraph)` - Set the base graph to process
- `.subgraph(rootIds: string[])` - Extract subgraph starting from these root IDs
- `.addEntities(entities: JsonLdEntity[])` - Add additional entities
- `.pipe(fn: PipeFunction)` - Add custom transformation function

#### Builder-Only Methods

- `.getCurrentGraph()` - Get the current graph state
- `.build(options?: BuildOptions)` - Build the final JSON-LD output

### Build Options

```typescript
interface BuildOptions {
  prettyPrint?: boolean; // Pretty-print JSON output (default: true)
  contextUrl?: string; // Custom context URL (default: 'https://schema.org')
  withScriptTag?: boolean; // Wrap in script tag (default: false)
  scriptId?: string; // Script tag ID
}
```

## Advanced Usage

### Complex Filtering Logic

The builder implements three distinct filtering paths based on configuration:

1. **Subgraph Mode**: When `subgraph()` is used, property filtering is applied during traversal
2. **IncludeIds Mode**: When `includeIds()` is used, entities are filtered first, then additional filters applied
3. **Global Mode**: Property filtering is applied first, then entity filtering

```typescript
// Subgraph mode - follows references with property filtering
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .subgraph(['org:hyperweb'])
  .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] })
  .build();

// IncludeIds mode - simple entity filtering
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .includeIds(['org:hyperweb', 'person:john'])
  .excludeTypes(['ImageObject'])
  .build();
```

### Custom Transformations

```typescript
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .includeTypes(['Person'])
  .pipe((graph) =>
    graph.map((entity) => ({
      ...entity,
      processed: true,
    }))
  )
  .pipe((graph) => graph.filter((entity) => entity.name))
  .build();
```

### Configuration Reuse

```typescript
// Base configuration
const baseConfig = createJsonLdConfig()
  .baseGraph(jsonldGraph)
  .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] });

// Page-specific configurations
const homeConfig = baseConfig.excludeTypes(['ImageObject']);
const blogConfig = baseConfig.includeTypes(['Article']);
const personConfig = baseConfig.includeTypes(['Person', 'Organization']);

// Use with different base graphs
const articlesConfig = baseConfig.baseGraph(articlesGraph);
```

## Options Processing Order

The JSON-LD builder processes options in a specific order defined by the `processGraph` method. Understanding this order is crucial for predicting the final output when multiple filtering options are applied.

### Processing Layers

The builder processes options in the following sequential layers:

#### 1. **Configuration Validation**

- Validates that a base graph is provided
- Checks for critical configuration errors that would break processing
- Throws errors if validation fails

#### 2. **Subgraph Extraction** (Layer 1)

- **Condition**: Only when `subgraphRoots` are configured via `.subgraph(rootIds)`
- **Process**: Extracts connected subgraphs starting from root entities
- **Property Filtering**: Applied **during** subgraph traversal for optimal performance
- **Result**: Property filters are marked as applied to avoid duplicate processing

```typescript
// Example: Subgraph extraction with property filtering
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .subgraph(['org:hyperweb']) // Layer 1: Extract subgraph
  .filterPropertiesByIds(['org:hyperweb'], { exclude: ['subjectOf'] }) // Applied during traversal
  .build();
```

#### 3. **Entity and Property Filtering** (Layer 2)

- **Condition**: When entity filters are configured (includeIds, excludeIds, includeTypes, etc.)
- **Sub-step 3a - Property Filtering**: Applied first if not already done in Layer 1
  - Filters properties based on entity IDs or types
  - Uses `filterGraphProperties()` function
- **Sub-step 3b - Entity Filtering**: Applied after property filtering
  - Filters entire entities based on ID, type, and other criteria
  - Uses `filterJsonLdGraph()` function

```typescript
// Example: Property filtering followed by entity filtering
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .filterPropertiesByTypes(['Article'], { include: ['headline', 'author'] }) // 3a: Property filtering
  .includeTypes(['Article', 'Person']) // 3b: Entity filtering
  .excludeIds(['unwanted:id']) // 3b: Additional entity filtering
  .build();
```

#### 4. **Entity Population**

- **Condition**: When `populateConfig` is set
- **Process**: Applies population rules to add related entities
- **Function**: Uses `applyPopulateConfig()`

#### 5. **Additional Entities**

- **Condition**: When additional entities are specified via `.addEntities()`
- **Process**: Appends additional entities to the graph
- **Note**: These entities bypass all previous filtering

#### 6. **Custom Transformation Pipes**

- **Condition**: When custom pipes are added via `.pipe(fn)`
- **Process**: Applies custom transformation functions in the order they were added
- **Note**: This is the final processing step before output

```typescript
// Example: Custom pipes applied last
const result = createJsonLdBuilder()
  .baseGraph(graph)
  .includeTypes(['Person'])
  .pipe((graph) => graph.map((entity) => ({ ...entity, processed: true }))) // Applied last
  .pipe((graph) => graph.filter((entity) => entity.name)) // Applied after previous pipe
  .build();
```

### Key Processing Rules

1. **Property Filters Before Entity Filters**: Property filtering always happens before entity filtering (except in subgraph mode where they're combined)

2. **Subgraph Mode Optimization**: When using subgraphs, property filtering is applied during traversal for better performance

3. **Single Property Filter Application**: Property filters are only applied once to avoid duplicate processing

4. **Additive Additional Entities**: Entities added via `.addEntities()` are appended after all filtering

5. **Sequential Pipe Execution**: Custom pipes are executed in the order they were added

## Performance Considerations

- **Immutable Configurations**: Each configuration method returns a new object, enabling safe reuse
- **Lazy Evaluation**: Graph processing only occurs when `build()` or `getCurrentGraph()` is called
- **Efficient Filtering**: Uses optimized filtering paths based on configuration type
- **Memory Management**: Avoids unnecessary intermediate copies of large graphs

## Development

### Prerequisites

- Node.js 16+
- pnpm (recommended package manager)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/hyperweb-io/jsonld-tools.git
cd jsonld-tools
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm run build
```
