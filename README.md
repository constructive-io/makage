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

# Update outdated cross-repo dependencies (structured JSON output)
makage update-deps --from ./constructive --in .

# Detect only, without writing any files
makage update-deps --from ./constructive --in . --dry-run

# Update this workspace from sibling repos checked out next to it
makage deps constructive
makage deps constructive pgsql-parser --install
makage deps --all --dry-run
makage deps --list
```

## Sibling Repo Dependency Updates (`deps`)

`makage deps` is the local, day-to-day front end for [`update-deps`](#cross-repo-dependency-updates-update-deps). It assumes all your repos are siblings on disk, so a bare name like `constructive` resolves to `../constructive` relative to the current workspace root — no `--from`/`--in` paths to type.

```bash
makage deps <sibling-repo...> [--all] [--list] [--dry-run] [--install] [--json] [--in <target>]
```

| Flag | Description |
|------|-------------|
| `--all` | Update from every sibling directory that is a pnpm workspace |
| `--list` | List sibling workspaces and exit |
| `--dry-run` | Report outdated deps without writing files (alias: `--check`) |
| `--install` | Run `pnpm install` in the target workspace when something changed |
| `--json` | Emit the structured summary on stdout (logs stay on stderr) |
| `--in` | Target workspace to update (defaults to the workspace root above `cwd`) |

Names containing a path separator (or starting with `.` / `/`) are treated as paths instead of sibling names, so `makage deps ../../other/repo` works too.

Wire it up as per-repo scripts:

```json
{
  "scripts": {
    "deps": "pnpm up -r -i -L",
    "deps:constructive": "makage deps constructive",
    "deps:pgsql-parser": "makage deps pgsql-parser",
    "deps:siblings": "makage deps --all"
  }
}
```

Then from `constructive-db`, `pnpm deps:constructive` pulls the latest versions published by `../constructive` into every `package.json` in the repo.

## Cross-Repo Dependency Updates (`update-deps`)

The `update-deps` command enables deterministic, version-aware dependency synchronization across repositories. It detects outdated packages **and updates the target repo's `package.json` files in place** (use `--dry-run` for detection only).

### How it works

1. **Discovers** all packages in a source pnpm workspace (by reading `pnpm-workspace.yaml`)
2. **Scans** the target repo's `package.json` files (supports both monorepo and non-workspace layouts)
3. **Cross-references** dependencies to find packages that exist in both source and target
4. **Compares versions** using semver to identify outdated packages
5. **Rewrites** outdated version specs in the target `package.json` files, preserving `^`/`~` prefixes and skipping `workspace:` deps (unless `--dry-run`)
6. **Outputs structured JSON** to stdout for CI consumption (logs go to stderr)

### Usage

```bash
makage update-deps --from <source-workspace> --in <target-repo> [--dry-run]
```

| Flag | Description |
|------|-------------|
| `--from` | Path to the source pnpm workspace (contains `pnpm-workspace.yaml`) |
| `--in` | Path to the target repo to scan for outdated deps |
| `--dry-run` | Detect only — report outdated deps without writing any files (alias: `--check`) |

### Output format

```json
{
  "sourcePackages": [{ "name": "@constructive/foo", "version": "1.2.3", "path": "packages/foo" }],
  "matchedPackages": [{ "name": "@constructive/foo", "currentVersion": "^1.1.0", "availableVersion": "1.2.3", "depType": "dependencies", "consumer": "@myapp/bar", "outdated": true }],
  "outdatedPackages": [/* subset of matchedPackages where outdated=true */],
  "updatedFiles": ["application/bar/package.json"],
  "dry_run": false,
  "has_dep_changes": true
}
```

### CI Integration

The `update-deps` command is used in GitHub Actions to automatically update downstream repos when the source workspace publishes new versions. The typical CI flow:

1. Check out the target repo + source workspace side by side
2. Run `makage update-deps --from ./constructive --in .` — this updates the target's `package.json` files and emits structured JSON
3. Run `pnpm install --no-frozen-lockfile` (workspace repos) or per-directory `pnpm install` to sync lockfiles
4. Create a PR with the results

### Supported target repos

The workflow currently updates:
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