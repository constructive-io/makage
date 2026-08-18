---
name: makage-overview
description: Reference for the makage CLI tool — build helper, asset management, workspace updates, and cross-repo dependency synchronization. Use when asked about makage commands, monorepo builds, update-deps, sibling-repo deps, or cross-repo dependency workflows.
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
| `makage update-deps --from <source> --in <target> [--dry-run]` | Cross-repo dependency update: rewrites outdated `package.json` specs in place (JSON output); `--dry-run` detects only |
| `makage deps <sibling...> [--all] [--list] [--dry-run] [--install] [--json]` | Local sibling-repo front end for `update-deps`: `constructive` resolves to `../constructive` |

## Sibling Repo Updates (`deps`)

For local, day-to-day use where every repo is checked out as a sibling directory. `makage deps constructive` from `constructive-db` is equivalent to `makage update-deps --from ../constructive --in <workspace-root>`.

```bash
makage deps constructive pgsql-parser   # update from named siblings
makage deps --all --dry-run             # preview updates from every sibling pnpm workspace
makage deps constructive --install      # run pnpm install afterwards when something changed
makage deps --list                      # list sibling workspaces
```

- Target defaults to the workspace root found above `cwd` (override with `--in`).
- Bare names resolve as siblings; anything with a path separator or leading `.`/`/` is treated as a path.
- A sibling without `pnpm-workspace.yaml` is an error, not a silent skip.
- Recommended repo scripts: `"deps:constructive": "makage deps constructive"`, `"deps:siblings": "makage deps --all"`.

## Cross-Repo Dependency Updates (`update-deps`)

### Purpose

Deterministic, version-aware dependency synchronization across repositories. This is the engine behind the [constructive-hub update-constructive-deps workflow](https://github.com/constructive-io/constructive-hub/blob/main/.github/workflows/update-constructive-deps.yml).

### Usage

```bash
makage update-deps --from <path-to-source-workspace> --in <path-to-target-repo> [--dry-run]
```

### Algorithm

1. Reads `pnpm-workspace.yaml` from `--from` to discover all packages + versions
2. Scans all `package.json` files in `--in` (supports workspace and non-workspace repos). Workspace patterns expand with pnpm's semantics — interior `*` segments (`functions/*/handlers/*`, `functions/*/pages`) and `!` exclusions included
3. Cross-references dependencies/devDependencies/peerDependencies/optionalDependencies
4. Strips `^`/`~`/`>=` prefixes and compares semver parts numerically
5. Skips `workspace:` protocol deps (always in sync)
6. Resolves `catalog:` / `catalog:<name>` specs against `catalog`/`catalogs` in the target's `pnpm-workspace.yaml`, and bumps the catalog entry there (one line rewritten, comments preserved) instead of the manifest. A cataloged dep is reported once, not once per consumer; a manifest that overrides a cataloged dep with an explicit range is bumped in place
7. Rewrites outdated specs in the target `package.json` files in place, preserving `^`/`~` prefixes and formatting (skipped with `--dry-run`/`--check`)
8. Outputs structured JSON to stdout; logs to stderr. `warnings` carries anything that could not be checked (e.g. `catalog:` for a dep with no catalog entry) so a catalog typo cannot masquerade as success

### JSON Output Schema

```json
{
  "sourcePackages": [{ "name": "string", "version": "string", "path": "string" }],
  "matchedPackages": [{
    "name": "string",
    "currentVersion": "string",
    "availableVersion": "string",
    "depType": "dependencies | devDependencies | peerDependencies | optionalDependencies",
    "consumer": "string — package name, or the catalog spec for cataloged deps",
    "file": "string — manifest that declares it, or pnpm-workspace.yaml for cataloged deps",
    "catalog": "string | undefined — catalog name when the version came from a catalog",
    "outdated": "boolean"
  }],
  "outdatedPackages": [/* subset of matchedPackages where outdated=true */],
  "updatedFiles": ["string — package.json / pnpm-workspace.yaml paths rewritten (empty in dry-run)"],
  "warnings": ["string — things that could not be checked, e.g. a missing catalog entry"],
  "dry_run": "boolean",
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
| `packages/makage/src/commands/updateDeps.ts` | Cross-repo dependency detection logic (`updateDeps` core + `--from/--in` CLI) |
| `packages/makage/src/commands/deps.ts` | Sibling-repo resolution front end over `updateDeps` |
| `packages/makage/src/commands/catalogs.ts` | pnpm catalog resolution + surgical `pnpm-workspace.yaml` edits |
| `packages/makage/src/commands/workspacePatterns.ts` | pnpm-compatible `packages:` pattern expansion |
| `packages/makage/src/commands/updateWorkspace.ts` | Workspace protocol updater |
| `packages/makage/src/commands/build.ts` | Build orchestration |
| `packages/makage/src/commands/copy.ts` | File copy with glob + flatten |
| `packages/makage/src/commands/clean.ts` | Directory removal |
| `packages/makage/src/commands/assets.ts` | Asset copy helper |
| `packages/makage/src/commands/buildTs.ts` | TypeScript CJS + ESM compilation |
| `packages/makage/src/commands/readmeFooter.ts` | README + FOOTER concatenation |
