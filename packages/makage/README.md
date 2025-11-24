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

- **Cross-platform copy** - Copy files with `--flat` option (replacement for `cpy`)
- **Cross-platform clean** - Recursively remove directories (replacement for `rimraf`)
- **README + Footer concatenation** - Combine README with footer content before publishing
- **Assets helper** - One-command copying of LICENSE, README, and package.json
- **Build TypeScript helper** - Run both CJS and ESM TypeScript builds
- **Update workspace dependencies** - Automatically convert internal package references to `workspace:*`
- **Zero dependencies** - Uses only Node.js built-in modules

## Install

```sh
npm install makage
```

## Usage

### CLI Commands

```bash
# Clean build directories (defaults to "dist")
makage clean
makage clean dist build temp  # or specify multiple directories

# Copy files to destination
makage copy ../../LICENSE README.md package.json dist --flat

# Concatenate README with footer
makage readme-footer --source README.md --footer FOOTER.md --dest dist/README.md

# Copy standard assets (LICENSE, package.json, README+FOOTER)
makage assets

# Build TypeScript (both CJS and ESM)
makage build-ts

# Update workspace dependencies
makage update-workspace
```

### Package.json Scripts

Replace your existing build scripts with `makage`:

```json
{
  "scripts": {
    "clean": "makage clean",
    "build": "makage clean && makage build-ts && makage assets",
    "prepublishOnly": "npm run build"
  }
}
```

Or using the simplified pattern:

```json
{
  "scripts": {
    "copy": "makage assets",
    "clean": "makage clean",
    "build": "npm run clean && tsc && tsc -p tsconfig.esm.json && npm run copy"
  }
}
```

## Commands

### `makage clean [path...]`

Recursively removes one or more paths. Defaults to removing `dist` if no paths are specified.

```bash
makage clean              # removes dist
makage clean dist build temp  # removes multiple directories
```

### `makage copy [...sources] <dest> [--flat]`

Copy files to a destination directory.

- Use `--flat` to copy files directly into the destination without preserving directory structure
- Last argument is the destination, all others are sources

```bash
makage copy ../../LICENSE README.md dist --flat
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

### `makage build-ts`

Runs TypeScript compilation for both CommonJS and ESM:
1. `tsc` (CommonJS)
2. `tsc -p tsconfig.esm.json` (ESM)

```bash
makage build-ts
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

## Programmatic Usage

You can also use `makage` commands programmatically:

```typescript
import { runCopy, runClean, runAssets } from 'makage';

async function build() {
  await runClean([]);  // defaults to ['dist']
  // ... your build steps
  await runAssets([]);
}
```

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