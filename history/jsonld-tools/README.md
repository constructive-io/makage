# JSON-LD Tools

A monorepo containing powerful JSON-LD processing tools and utilities.

## Overview

This repository provides a comprehensive set of tools for working with JSON-LD data, including advanced filtering, graph processing, and configuration management capabilities.

## Packages

### [`jsonldjs`](./packages/jsonld-tools)

A powerful, generic JSON-LD builder with comprehensive entity and property filtering capabilities. Features include:

- **Configuration-First Design**: Separate immutable configuration from graph processing
- **Fluent Interface**: Chainable methods for building complex filtering logic
- **Property-Level Filtering**: Filter properties by entity IDs or types
- **Subgraph Extraction**: Extract connected subgraphs with reference following
- **Type Safety**: Full TypeScript support with proper type inference

## Quick Start

```bash
# Install the main package
pnpm add jsonldjs

# Basic usage
import { createJsonLdBuilder } from 'jsonldjs';

const result = createJsonLdBuilder()
  .baseGraph(jsonldGraph)
  .includeTypes(['Organization', 'Person'])
  .excludeTypes(['ImageObject'])
  .build({ prettyPrint: true });
```

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

3. Build all packages:

```bash
pnpm run build
```

### Repository Structure

```
jsonld-tools/
├── packages/
│   └── jsonld-tools/     # Main JSON-LD processing library
├── fixtures/             # Test data and examples
└── docs/                 # Documentation
```

## Documentation

For detailed documentation and API reference, see the individual package READMEs:

- [jsonldjs Documentation](./packages/jsonld-tools/README.md)

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main branch.
