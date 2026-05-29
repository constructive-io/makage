# makage

<p align="center">
  <img src="https://raw.githubusercontent.com/constructive-io/makage/refs/heads/main/docs/img/logo.svg" width="80">
  <br />
  Tiny build helper for monorepo packages
  <br />
  <a href="https://github.com/constructive-io/makage/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/makage/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/makage/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

`makage` is a tiny, cross-platform build helper that replaces common build tools like `cpy` and `rimraf` with zero dependencies. It provides essential commands for managing package builds in monorepos.

> **makage** = `make` + `package`. A delightful portmanteau, like brunch for build tools—except makage actually gets things done.

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

# Detect outdated cross-repo dependencies (structured JSON output)
makage update-deps --from ./constructive --in .
```

## Cross-Repo Dependency Updates (`update-deps`)

The `update-deps` command enables deterministic, version-aware dependency synchronization across repositories. It is the engine behind the [constructive-hub update-constructive-deps workflow](https://github.com/constructive-io/constructive-hub/blob/main/.github/workflows/update-constructive-deps.yml).

### How it works

1. **Discovers** all packages in a source pnpm workspace (by reading `pnpm-workspace.yaml`)
2. **Scans** the target repo's `package.json` files (supports both monorepo and non-workspace layouts)
3. **Cross-references** dependencies to find packages that exist in both source and target
4. **Compares versions** using semver to identify outdated packages
5. **Outputs structured JSON** to stdout for CI consumption (logs go to stderr)

### Usage

```bash
makage update-deps --from <source-workspace> --in <target-repo>
```

| Flag | Description |
|------|-------------|
| `--from` | Path to the source pnpm workspace (contains `pnpm-workspace.yaml`) |
| `--in` | Path to the target repo to scan for outdated deps |

### Output format

```json
{
  "sourcePackages": [{ "name": "@constructive/foo", "version": "1.2.3", "path": "packages/foo" }],
  "matchedPackages": [{ "name": "@constructive/foo", "currentVersion": "^1.1.0", "availableVersion": "1.2.3", "depType": "dependencies", "consumer": "@myapp/bar", "outdated": true }],
  "outdatedPackages": [/* subset of matchedPackages where outdated=true */],
  "has_dep_changes": true
}
```

### CI Integration

The `update-deps` command is used in GitHub Actions to automatically update downstream repos when the source workspace publishes new versions. The typical CI flow:

1. Check out the target repo + source workspace side by side
2. Run `makage update-deps --from ./constructive --in .` for structured JSON detection
3. Parse the JSON output to extract outdated package names
4. Run `pnpm update -r --latest <packages...>` to update them
5. Create a PR with the results

Target repos are categorized into two strategies:
- **Workspace repos** (have `pnpm-workspace.yaml`): Use `pnpm update -r --latest` for bulk updates
- **Non-workspace repos** (e.g., template repos): Update each `package.json` individually via `jq` or per-directory `pnpm update`

### Supported target repos

The constructive-hub workflow currently updates:
- `constructive-db` (default, also triggers schema propagation)
- `dashboard`
- `pgpm-modules`
- `dev-utils`
- `sandbox-templates`
- `pgpm-boilerplates`

## Documentation

For detailed usage and API documentation, see [packages/makage/README.md](./packages/makage/README.md).

## Development

### Setup

1. Clone the repository:

```bash
git clone https://github.com/constructive-io/makage.git
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
👉 https://constructive.io

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.