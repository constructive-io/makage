# dev-utils

<p align="center">
  <img src="https://raw.githubusercontent.com/hyperweb-io/dev-utils/refs/heads/main/docs/img/logo.svg" width="80">
  <br />
  Open-source development utilities for modern web applications
  <br />
  <a href="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/hyperweb-io/dev-utils/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

A comprehensive collection of TypeScript utilities for working with schemas, JSON-LD, API clients, and general-purpose development tools.

## Overview

This monorepo provides a curated set of packages for building modern web applications, with a focus on:

- **Type-Safe Schema Processing**: Convert JSON Schema and OpenAPI specifications to TypeScript
- **JSON-LD Tooling**: Advanced JSON-LD processing with filtering and graph operations
- **API Clients**: Lightweight HTTP clients for Node.js and browsers
- **Developer Utilities**: String manipulation, package detection, and object handling

## Packages

### Schema & TypeScript Generation

#### [`schema-typescript`](./packages/schema-typescript)
Convert JSON schemas to TypeScript interfaces automatically with full support for `$ref` and `$defs`.

```bash
npm install schema-typescript
```

**Features:**
- JSON Schema to TypeScript conversion
- Full support for references and definitions
- Type-safe interface generation
- Minimal dependencies

#### [`schema-sdk`](./packages/schema-sdk)
Generate TypeScript clients from OpenAPI specifications with comprehensive type safety.

```bash
npm install schema-sdk
```

**Features:**
- OpenAPI Specification (Swagger) support
- Automatic TypeScript client generation
- JSON Patch support for schema modifications
- Modular and reusable design

#### [`@schema-typescript/cli`](./packages/cli)
Command-line interface for schema-typescript operations.

```bash
npm install @schema-typescript/cli
```

### JSON-LD Tools

#### [`jsonldjs`](./packages/jsonld-tools)
A powerful, generic JSON-LD builder with comprehensive entity and property filtering capabilities.

```bash
npm install jsonldjs
```

**Features:**
- Configuration-first design with immutable builders
- Fluent interface for building complex filtering logic
- Property-level filtering by entity IDs or types
- Subgraph extraction with reference following
- Full TypeScript support with type inference

**Quick Example:**
```typescript
import { createJsonLdBuilder } from 'jsonldjs';

const result = createJsonLdBuilder()
  .baseGraph(jsonldGraph)
  .includeTypes(['Organization', 'Person'])
  .excludeTypes(['ImageObject'])
  .build({ prettyPrint: true });
```

### API Clients

#### [`@interweb/node-api-client`](./packages/node-api-client)
Lightweight and flexible HTTP client for Node.js applications.

```bash
npm install @interweb/node-api-client
```

**Features:**
- Support for GET, POST, PUT, PATCH, DELETE
- Customizable headers and query parameters
- Timeout configuration
- Node.js optimized

#### [`@interweb/fetch-api-client`](./packages/fetch-api-client)
Universal HTTP client supporting both Node.js and browser environments.

```bash
npm install @interweb/fetch-api-client
```

**Features:**
- Works in Node.js and browsers
- Fetch API based
- Common HTTP methods support
- Customizable options

#### [`@interweb/http-errors`](./packages/http-errors)
HTTP error handling utilities for API clients.

```bash
npm install @interweb/http-errors
```

### Utilities

#### [`komoji`](./packages/komoji)
the tiny case transformer — effortlessly transform strings between naming conventions

```bash
npm install komoji
```

#### [`@interweb/find-pkg`](./packages/find-pkg)
Locate and parse `package.json` files from within build directories or packages.

```bash
npm install @interweb/find-pkg
```

**Example:**
```javascript
import { findPackageJson } from '@interweb/find-pkg';

const packageJson = findPackageJson();
console.log('Package name:', packageJson.name);
console.log('Version:', packageJson.version);
```

#### [`nested-obj`](./packages/nested-obj)
Simple and lightweight utility for safely accessing and modifying nested object properties.

```bash
npm install nested-obj
```

**Features:**
- Safe nested property access
- Set values at specific paths
- Check if paths exist
- TypeScript support

**Example:**
```typescript
import objectPath from 'nested-obj';

const obj = { user: { name: 'John', address: { city: 'NYC' } } };

// Get nested values
const name = objectPath.get(obj, 'user.name'); // 'John'

// Set nested values
objectPath.set(obj, 'user.address.zip', '10001');

// Check if path exists
const hasCity = objectPath.has(obj, 'user.address.city'); // true
```

#### [`strfy-js`](./packages/strfy-js)
Stringify JSON as JavaScript with extended serialization capabilities.

```bash
npm install strfy-js
```

**Features:**
- Extended serialization beyond standard JSON
- Properties without quotes
- Customizable output (camelCase, quotes, etc.)
- Lightweight and optimized for performance

**Example:**
```javascript
import { jsStringify } from 'strfy-js';

const obj = {
  "$schema": "schema.json",
  "chain_id": "cosmos-1"
};

console.log(jsStringify(obj, { camelCase: true, quotes: 'single' }));
// Output: { $schema: 'schema.json', chainId: 'cosmos-1' }
```

## Development

### Prerequisites

- Node.js 16+
- pnpm (recommended) or yarn

### Getting Started

When first cloning the repo:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Available Scripts

```bash
# Build all packages
pnpm build

# Clean all build artifacts
pnpm clean

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint
```

## Development

### Setup

1. Clone the repository:

```bash
git clone https://github.com/hyperweb-io/dev-utils.git
```

2. Install dependencies:

```bash
cd dev-utils
pnpm install
pnpm build
```

3. Test the package of interest:

```bash
cd packages/<packagename>
pnpm test:watch
```

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
