# komoji ✨

<p align="center">
  <img src="https://raw.githubusercontent.com/hyperweb-io/dev-utils/refs/heads/main/docs/img/logo.svg" width="80">
  <br />
    <strong>the tiny case transformer</strong>
  <br />
  <br />
  Effortlessly transform strings between naming conventions
  <br />
  <br />
  <a href="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/hyperweb-io/dev-utils/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

## Why komoji?

Named after the Japanese word 小文字 (komoji, "lowercase letters"), komoji is your friendly companion for working with naming conventions. It's tiny, focused, and does one thing exceptionally well: transforming strings between different cases with zero dependencies.

Perfect for:
- 🔄 Converting API responses to JavaScript conventions
- 🎨 Generating code from schemas and templates
- 🛠️ Building developer tools and CLI utilities
- 📦 Processing configuration files across formats

## Install

```sh
npm install komoji
```

## Usage

### Transform to PascalCase

```typescript
import { toPascalCase } from 'komoji';

toPascalCase('hello-world');      // HelloWorld
toPascalCase('user_name');        // UserName
toPascalCase('api response');     // ApiResponse
toPascalCase('my-component_v2');  // MyComponentV2
```

### Transform to camelCase

```typescript
import { toCamelCase } from 'komoji';

toCamelCase('hello-world');       // helloWorld
toCamelCase('user_name');         // userName
toCamelCase('api-response-data'); // apiResponseData

// Strip leading non-alphabetic characters
toCamelCase('__private_field', true);  // privateField
toCamelCase('123-invalid', true);      // invalid
```

### Validate Identifiers

```typescript
import { isValidIdentifier, isValidIdentifierCamelized } from 'komoji';

// Check if string is a valid JavaScript identifier
isValidIdentifier('myVar');        // true
isValidIdentifier('my-var');       // false
isValidIdentifier('123abc');       // false
isValidIdentifier('_private');     // true

// Check if string can be camelized into valid identifier
isValidIdentifierCamelized('my-var');   // true (can become myVar)
isValidIdentifierCamelized('valid_id'); // true
isValidIdentifierCamelized('-invalid'); // false (starts with hyphen)
```

## API

### `toPascalCase(str: string): string`

Converts a string to PascalCase by capitalizing the first letter of each word and removing separators.

**Supported separators:** hyphens (`-`), underscores (`_`), spaces (` `)

### `toCamelCase(key: string, stripLeadingNonAlphabetChars?: boolean): string`

Converts a string to camelCase with an optional flag to strip leading non-alphabetic characters.

**Parameters:**
- `key` - The string to transform
- `stripLeadingNonAlphabetChars` - Remove leading non-alphabetic characters (default: `false`)

### `isValidIdentifier(key: string): boolean`

Checks if a string is a valid JavaScript identifier (follows standard naming rules).

### `isValidIdentifierCamelized(key: string): boolean`

Checks if a string can be transformed into a valid JavaScript identifier (allows internal hyphens that will be removed during camelization).

## Design Philosophy

komoji embraces simplicity:
- 🎯 Zero dependencies
- 🪶 Tiny footprint
- 🚀 Fast and predictable
- 💎 Pure functions
- 📖 Clear, focused API
