---
name: makage-overview
description: Reference for the makage CLI tool — build helper, asset management, workspace updates, and cross-repo dependency synchronization. Use when asked about makage commands, monorepo builds, update-deps, or cross-repo dependency workflows.
---

# makage

Tiny, zero-dependency build helper for monorepo packages. Replaces `cpy`, `rimraf`, and `copyfiles` with a single CLI.

**Source:** <https://github.com/constructive-io/makage>  
**npm:** `makage` (published from `packages/makage/dist`)

## CLI Commands

| Command | Description |
|---------|-------------|
| `makage build [--dev]` | Full build: clean + build-ts + assets. `--dev` adds `--declarationMap` |
| `makage clean [path...]` | Remove directories (defaults to `dist`) |
| `makage build-ts [--dev]` | TypeScript compilation for CJS + ESM |
| `makage copy [...sources] <dest> [--flat] [--footer]` | Copy files with glob support |
| `makage assets` | Copy LICENSE + package.json + README+FOOTER to dist |
| `makage readme-footer --source <f> --footer <f> --dest <f>` | Concatenate README with footer |
| `makage update-workspace` | Convert internal deps to `workspace:*` protocol |
| `makage update-deps --from <source> --in <target>` | Cross-repo dependency detection (JSON output) |

## Cross-Repo Dependency Updates (`update-deps`)

### Purpose

Deterministic, version-aware dependency synchronization across repositories. This is the engine behind the [constructive-hub update-constructive-deps workflow](https://github.com/constructive-io/constructive-hub/blob/main/.github/workflows/update-constructive-deps.yml).

### Usage

```bash
makage update-deps --from <path-to-source-workspace> --in <path-to-target-repo>
```

### Algorithm

1. Reads `pnpm-workspace.yaml` from `--from` to discover all packages + versions
2. Scans all `package.json` files in `--in` (supports workspace and non-workspace repos)
3. Cross-references dependencies/devDependencies/peerDependencies/optionalDependencies
4. Strips `^`/`~`/`>=` prefixes and compares semver parts numerically
5. Skips `workspace:` protocol deps (always in sync)
6. Outputs structured JSON to stdout; logs to stderr

### JSON Output Schema

```json
{
  "sourcePackages": [{ "name": "string", "version": "string", "path": "string" }],
  "matchedPackages": [{
    "name": "string",
    "currentVersion": "string",
    "availableVersion": "string",
    "depType": "dependencies | devDependencies | peerDependencies | optionalDependencies",
    "consumer": "string",
    "outdated": "boolean"
  }],
  "outdatedPackages": [/* subset of matchedPackages where outdated=true */],
  "has_dep_changes": "boolean"
}
```

### CI Workflow Integration

The `update-constructive-deps` workflow in `constructive-hub` runs per target repo:

1. Checks out target repo + `constructive` workspace side by side
2. Runs `makage update-deps --from ./constructive --in .`
3. Parses JSON → extracts outdated package names
4. **Workspace repos** (`constructive-db`, `dashboard`, `pgpm-modules`, `dev-utils`):
   - `echo "$OUTDATED_NAMES" | xargs pnpm update -r --latest`
   - `pnpm install --no-frozen-lockfile` (sync lockfile)
   - `pnpm -r build` (rebuild)
5. **Non-workspace repos** (`sandbox-templates`, `pgpm-boilerplates`):
   - Per-directory: if lockfile exists → `pnpm update --latest $name`
   - If no lockfile → `jq` to set `^<version>` directly in `package.json`
6. Creates branch `deps-update/<name-or-timestamp>` and opens PR
7. For `constructive-db`: chains schema propagation via `repository_dispatch`

### Triggers

- **Manual** (`workflow_dispatch`): select which repos to update, optional PR name
- **Automatic** (`repository_dispatch: constructive-published`): fires when constructive publishes

### Target Repos

| Repo | Type | Default |
|------|------|---------|
| `constructive-db` | workspace | enabled (also triggers schema propagation) |
| `dashboard` | workspace | disabled |
| `pgpm-modules` | workspace | disabled |
| `dev-utils` | workspace | disabled |
| `sandbox-templates` | non-workspace | disabled |
| `pgpm-boilerplates` | non-workspace | disabled |

## Monorepo Conventions

makage assumes the following structure:

- Build output in `dist/`
- pnpm workspace protocol for internal dependencies
- `publishConfig.directory` set to `dist` in `package.json`
- Shared `LICENSE` at monorepo root
- Optional `FOOTER.md` per package (appended to README before publish)

## Key Files

| Path | Purpose |
|------|---------|
| `packages/makage/src/cli.ts` | CLI entrypoint and command dispatch |
| `packages/makage/src/commands/updateDeps.ts` | Cross-repo dependency detection logic |
| `packages/makage/src/commands/updateWorkspace.ts` | Workspace protocol updater |
| `packages/makage/src/commands/build.ts` | Build orchestration |
| `packages/makage/src/commands/copy.ts` | File copy with glob + flatten |
| `packages/makage/src/commands/clean.ts` | Directory removal |
| `packages/makage/src/commands/assets.ts` | Asset copy helper |
| `packages/makage/src/commands/buildTs.ts` | TypeScript CJS + ESM compilation |
| `packages/makage/src/commands/readmeFooter.ts` | README + FOOTER concatenation |
