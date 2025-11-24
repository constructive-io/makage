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
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

`makage` is a tiny, cross-platform build helper that replaces common build tools like `cpy` and `rimraf` with zero dependencies. It provides essential commands for managing package builds in monorepos.

> **makage** = `make` + `package`. A delightful portmanteau, like brunch for build tools—except makage actually gets things done.

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

## Quick Start

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

## Documentation

For detailed usage and API documentation, see [packages/makage/README.md](./packages/makage/README.md).

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