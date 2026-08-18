import { parseDocument } from 'yaml';

export const DEFAULT_CATALOG = 'default';

export type Catalogs = Map<string, Record<string, string>>;

/**
 * `catalog:` and `catalog:default` both refer to the default catalog;
 * `catalog:<name>` refers to a named one. Anything else is not a catalog spec.
 */
export function parseCatalogSpec(spec: string): string | null {
  if (!spec.startsWith('catalog:')) return null;
  const name = spec.slice('catalog:'.length).trim();
  return name === '' ? DEFAULT_CATALOG : name;
}

/**
 * Read the `catalog:` (default) and `catalogs:` (named) maps out of a
 * `pnpm-workspace.yaml`. `catalogs.default` and `catalog` are the same catalog;
 * entries from `catalog` win, matching pnpm's precedence.
 */
export function readCatalogs(workspaceYaml: string): Catalogs {
  const catalogs: Catalogs = new Map();

  let parsed: any;
  try {
    parsed = parseDocument(workspaceYaml).toJS();
  } catch {
    return catalogs;
  }
  if (!parsed || typeof parsed !== 'object') return catalogs;

  const named = parsed.catalogs;
  if (named && typeof named === 'object') {
    for (const [name, entries] of Object.entries(named)) {
      if (entries && typeof entries === 'object') {
        catalogs.set(name, { ...(entries as Record<string, string>) });
      }
    }
  }

  const defaultCatalog = parsed.catalog;
  if (defaultCatalog && typeof defaultCatalog === 'object') {
    catalogs.set(DEFAULT_CATALOG, {
      ...(catalogs.get(DEFAULT_CATALOG) ?? {}),
      ...(defaultCatalog as Record<string, string>)
    });
  }

  return catalogs;
}

export function getCatalogSpec(catalogs: Catalogs, catalogName: string, depName: string): string | undefined {
  const entries = catalogs.get(catalogName);
  const spec = entries?.[depName];
  return typeof spec === 'string' ? spec : undefined;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isBlank(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

interface Block {
  /** first line of the block body */
  start: number;
  /** one past the last line of the block body */
  end: number;
}

/** Body of the mapping opened by `lines[headerIndex]`, by indentation. */
function blockBody(lines: string[], headerIndex: number): Block {
  const headerIndent = indentOf(lines[headerIndex]);
  let end = headerIndex + 1;
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (isBlank(lines[i])) continue;
    if (indentOf(lines[i]) <= headerIndent) break;
    end = i + 1;
  }
  return { start: headerIndex + 1, end };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keyLineRegExp(key: string): RegExp {
  return new RegExp(`^(\\s*)(['"]?)${escapeRegExp(key)}\\2\\s*:(.*)$`);
}

function findKeyLine(lines: string[], key: string, block: Block): number {
  const pattern = keyLineRegExp(key);
  let keyIndent: number | null = null;

  for (let i = block.start; i < block.end; i++) {
    if (isBlank(lines[i])) continue;
    const indent = indentOf(lines[i]);
    // only consider direct children of the block
    if (keyIndent === null) keyIndent = indent;
    if (indent !== keyIndent) continue;
    if (pattern.test(lines[i])) return i;
  }

  return -1;
}

function findTopLevelKeyLine(lines: string[], key: string): number {
  return findKeyLine(lines, key, { start: 0, end: lines.length });
}

/** Rewrite the scalar of `<key>: <value>`, keeping quoting and trailing comment. */
function replaceScalar(line: string, key: string, newValue: string): string | null {
  const match = line.match(keyLineRegExp(key));
  if (!match) return null;

  const [, indent, quote, rest] = match;
  const value = rest.match(/^(\s*)(['"]?)([^'"#]*?)\2(\s*)(#.*)?$/);
  if (!value) return null;

  const [, gap, valueQuote, , commentGap, comment] = value;
  return `${indent}${quote}${key}${quote}:${gap}${valueQuote}${newValue}${valueQuote}${commentGap}${comment ?? ''}`;
}

/** Locate the line holding a catalog entry, searching `catalog:` then `catalogs.<name>:`. */
function findCatalogEntryLine(lines: string[], catalogName: string, depName: string): number {
  const candidates: Block[] = [];

  if (catalogName === DEFAULT_CATALOG) {
    const header = findTopLevelKeyLine(lines, 'catalog');
    if (header !== -1) candidates.push(blockBody(lines, header));
  }

  const namedHeader = findTopLevelKeyLine(lines, 'catalogs');
  if (namedHeader !== -1) {
    const namedBlock = blockBody(lines, namedHeader);
    const entryHeader = findKeyLine(lines, catalogName, namedBlock);
    if (entryHeader !== -1) candidates.push(blockBody(lines, entryHeader));
  }

  for (const block of candidates) {
    const line = findKeyLine(lines, depName, block);
    if (line !== -1) return line;
  }

  return -1;
}

/**
 * Set a catalog entry to `newSpec`.
 *
 * Rewrites the single line that holds the entry so the rest of the file —
 * comments included — is byte-identical. Falls back to a document edit (which
 * still preserves comments, but may reformat) for flow-style catalogs.
 * Returns `null` when the entry does not exist.
 */
export function setCatalogSpec(
  workspaceYaml: string,
  catalogName: string,
  depName: string,
  newSpec: string
): string | null {
  const newline = workspaceYaml.includes('\r\n') ? '\r\n' : '\n';
  const lines = workspaceYaml.split(/\r?\n/);

  const entryLine = findCatalogEntryLine(lines, catalogName, depName);
  if (entryLine !== -1) {
    const rewritten = replaceScalar(lines[entryLine], depName, newSpec);
    if (rewritten !== null) {
      lines[entryLine] = rewritten;
      return lines.join(newline);
    }
  }

  const doc = parseDocument(workspaceYaml);
  const paths =
    catalogName === DEFAULT_CATALOG
      ? [
        ['catalog', depName],
        ['catalogs', DEFAULT_CATALOG, depName]
      ]
      : [['catalogs', catalogName, depName]];

  for (const p of paths) {
    if (doc.hasIn(p)) {
      doc.setIn(p, newSpec);
      return doc.toString();
    }
  }

  return null;
}
