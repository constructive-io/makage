# makage

<p align="center">
  <img src="https://raw.githubusercontent.com/hyperweb-io/makage/refs/heads/main/docs/img/logo.svg" width="80">
  <br />
  Tiny build helper for monorepo packages
  <br />
  <a href="https://github.com/hyperweb-io/makage/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/hyperweb-io/makage/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/hyperweb-io/makage/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

`makage` is a tiny, cross-platform build helper that replaces common build tools like `cpy` and `rimraf` with zero dependencies. It provides essential commands for managing package builds in monorepos.

> **makage** = `make` + `package`. A delightful portmanteau, like brunch for build tools—except makage actually gets things done.

## Install

```sh
npm install makage
```

## Quick Start

Replace your existing build scripts with `makage`:

```json
{
  "scripts": {
    "build": "makage build",
    "build:dev": "makage build --dev",
    "prepublishOnly": "npm run build"
  }
}
```

## Before & After

See how `makage` simplifies your build scripts:

### Development Builds

**Before:**
```json
"build:dev": "npm run clean; tsc -p tsconfig.json --declarationMap; tsc -p tsconfig.esm.json --declarationMap; npm run copy"
```

**After:**
```json
"build:dev": "makage build --dev"
```

Or if you need more control:
```json
"build:dev": "makage clean && makage build-ts --dev && makage copy"
```

### Copying Files

**Before:**
```json
"copy": "copyfiles -f ../../LICENSE README.md package.json dist"
```

**After:**
```json
"copy": "makage copy ../../LICENSE README.md package.json dist --flat"
```

**Bonus:** Add `--footer` to automatically concatenate your README with a footer:
```json
"copy": "makage copy ../../LICENSE README.md package.json dist --flat --footer"
```

### Copying with Glob Patterns

**Before:**
```json
"copy:sql": "copyfiles -f src/migrate/sql/* dist/migrate/sql && copyfiles -f src/migrate/sql/* dist/esm/migrate/sql"
```

**After:**
```json
"copy:sql": "makage copy src/migrate/sql/* dist/migrate/sql --flat && makage copy src/migrate/sql/* dist/esm/migrate/sql --flat"
```

Or with recursive patterns:
```json
"copy:all-sql": "makage copy src/**/*.sql dist/sql --flat"
```

> **Note:** For convenience, `makage assets` combines copy + footer functionality and is kept for backwards compatibility.

## Assumptions

This tool is designed for monorepos that follow a specific package structure. If you use packages the way we do, `makage` assumes:

- **`dist/` folder** - Your build output goes to a `dist/` directory
- **pnpm workspaces** - You're using pnpm workspace protocol for internal dependencies
- **`publishConfig.directory` set to `dist`** - Your `package.json` publishes from the `dist/` folder
  - This enables tree-shaking with deep imports and modular development
- **Shared LICENSE** - The `LICENSE` file in the monorepo root is copied to each package when published
- **Assets copied to `dist/`** - Before publishing, assets (LICENSE, README, package.json) are copied into `dist/` so pnpm can publish them from there
- **Optional: `FOOTER.md`** - If present in a package directory, it will be appended to `README.md` before being copied to `dist/`

These conventions allow for clean package distribution while maintaining a modular development structure.

## Features

- **One-command builds** - `makage build` runs clean, TypeScript compilation, and asset copying
- **Development mode** - Add `--dev` for source maps and faster iteration
- **Glob pattern support** - Copy files using patterns like `src/**/*.sql` (replacement for `copyfiles`)
- **Cross-platform copy** - Copy files with `--flat` and `--footer` options (replacement for `cpy`)
- **Cross-platform clean** - Recursively remove directories (replacement for `rimraf`)
- **README + Footer concatenation** - Combine README with footer content before publishing
- **Assets helper** - One-command copying of LICENSE, README, and package.json
- **Build TypeScript helper** - Run both CJS and ESM TypeScript builds
- **Update workspace dependencies** - Automatically convert internal package references to `workspace:*`
- **Zero dependencies** - Uses only Node.js built-in modules

## Usage

### CLI Commands

```bash
# Full build (clean + build-ts + assets)
makage build

# Full build with development mode (adds --declarationMap)
makage build --dev

# Clean build directories (defaults to "dist")
makage clean
makage clean dist build temp  # or specify multiple directories

# Build TypeScript (both CJS and ESM)
makage build-ts

# Build TypeScript with source maps for development
makage build-ts --dev

# Copy files to destination
makage copy ../../LICENSE README.md package.json dist --flat

# Copy files with glob patterns
makage copy src/migrate/sql/* dist/migrate/sql --flat
makage copy src/**/*.sql dist/sql --flat

# Copy with automatic README + footer concatenation
makage copy ../../LICENSE README.md package.json dist --flat --footer

# Copy standard assets (LICENSE, package.json, README+FOOTER)
makage assets

# Concatenate README with footer (lower-level command)
makage readme-footer --source README.md --footer FOOTER.md --dest dist/README.md

# Update workspace dependencies
makage update-workspace
```

## Commands

### `makage build [--dev]`

Complete build workflow that runs clean, build-ts, and assets in sequence.

- Use `--dev` to enable source maps via `--declarationMap` flag

```bash
makage build       # production build
makage build --dev # development build with source maps
```

### `makage clean [path...]`

Recursively removes one or more paths. Defaults to removing `dist` if no paths are specified.

```bash
makage clean              # removes dist
makage clean dist build temp  # removes multiple directories
```

### `makage copy [...sources] <dest> [--flat] [--footer]`

Copy files to a destination directory.

- Use `--flat` to copy files directly into the destination without preserving directory structure
- Use `--footer` to automatically concatenate README.md with ../../FOOTER.md during copy
- Supports glob patterns: `*` (any files), `**` (recursive), `?` (single char)
- Last argument is the destination, all others are sources

```bash
makage copy ../../LICENSE README.md dist --flat
makage copy ../../LICENSE README.md package.json dist --flat --footer
makage copy src/migrate/sql/* dist/migrate/sql --flat
makage copy src/**/*.sql dist/sql --flat
```

### `makage readme-footer --source <file> --footer <file> --dest <file>`

Concatenate a README with a footer file, separated by a horizontal rule.

```bash
makage readme-footer --source README.md --footer FOOTER.md --dest dist/README.md
```

### `makage assets`

Combines common asset copying tasks:
1. Copies `../../LICENSE` to `dist/`
2. Copies `package.json` to `dist/`
3. Concatenates `README.md` + `FOOTER.md` into `dist/README.md`

```bash
makage assets
```

### `makage build-ts [--dev]`

Runs TypeScript compilation for both CommonJS and ESM:
1. `tsc` (CommonJS)
2. `tsc -p tsconfig.esm.json` (ESM)

- Use `--dev` to add `--declarationMap` for better debugging experience

```bash
makage build-ts       # production build
makage build-ts --dev # development build with source maps
```

### `makage update-workspace`

Updates all internal package dependencies to use the `workspace:*` protocol. This is useful in monorepos when you want to ensure all cross-package references use workspace linking.

Run from the monorepo root:

```bash
makage update-workspace
```

This will:
1. Scan all packages in the `packages/` directory
2. Identify internal package names
3. Update all dependencies, devDependencies, peerDependencies, and optionalDependencies
4. Convert version numbers to `workspace:*` for internal packages

## Why makage?

Most monorepo packages need the same basic build operations:
- Clean output directories
- Copy LICENSE and README to distribution
- Build TypeScript for both CJS and ESM

Instead of installing multiple dependencies (`cpy`, `rimraf`, etc.) in every package, `makage` provides these essentials with zero dependencies, using only Node.js built-in modules.

## Development

### Setup

1. Clone the repository:

```bash
git clone https://github.com/hyperweb-io/makage.git
```

2. Install dependencies:

```bash
cd makage
pnpm install
pnpm build
```

3. Test the package:

```bash
cd packages/makage
pnpm test:watch
```

## Credits

Built for developers, with developers.  
👉 https://launchql.com | https://hyperweb.io

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.