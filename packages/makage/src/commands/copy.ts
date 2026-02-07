import fs from 'node:fs/promises';
import path from 'node:path';
import { findRootFile } from './workspace';

interface CopyOptions {
  flat: boolean;
  footer: boolean;
}

// Very simple arg parser: last non-flag is dest, the rest are sources
export async function runCopy(args: string[]) {
  const opts: CopyOptions = { flat: false, footer: false };
  const positional: string[] = [];

  for (const arg of args) {
    if (arg === '--flat') {
      opts.flat = true;
    } else if (arg === '--footer') {
      opts.footer = true;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    throw new Error('copy requires at least one source and one destination');
  }

  const dest = positional[positional.length - 1];
  const sources = positional.slice(0, -1);

  await fs.mkdir(dest, { recursive: true });

  // Expand all sources (handles glob patterns)
  const expandedSources: string[] = [];
  for (const src of sources) {
    if (hasGlobChars(src)) {
      const matched = await expandGlob(src);
      expandedSources.push(...matched);
    } else {
      expandedSources.push(src);
    }
  }

  if (expandedSources.length === 0) {
    throw new Error('No files matched the patterns');
  }

  for (const src of expandedSources) {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      throw new Error(`Directories not yet supported as sources: ${src}`);
    }

    const baseName = path.basename(src);
    const target = opts.flat
      ? path.join(dest, baseName)
      : path.join(dest, src);

    const targetDir = path.dirname(target);
    await fs.mkdir(targetDir, { recursive: true });

    // If --footer is specified and this is README.md, concatenate with footer
    if (opts.footer && baseName === 'README.md') {
      await copyReadmeWithFooter(src, target);
    } else {
      await fs.copyFile(src, target);
      console.log(`[makage] copied ${src} -> ${target}`);
    }
  }
}

function hasGlobChars(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

async function expandGlob(pattern: string): Promise<string[]> {
  // Simple glob expansion for common patterns like 'dir/*.ext' or 'dir/**/*.ext'
  const parts = pattern.split('/');
  let currentPath = '';
  let remainingParts: string[] = [];

  // Find the first part with glob chars
  let globIndex = parts.findIndex(p => hasGlobChars(p));
  if (globIndex === -1) return [pattern];

  currentPath = parts.slice(0, globIndex).join('/');
  remainingParts = parts.slice(globIndex);

  if (!currentPath) currentPath = '.';

  return await walkAndMatch(currentPath, remainingParts);
}

async function walkAndMatch(basePath: string, patterns: string[]): Promise<string[]> {
  if (patterns.length === 0) return [basePath];

  const [first, ...rest] = patterns;
  const results: string[] = [];

  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name);

      if (first === '**') {
        // Recursive glob
        if (rest.length === 0) {
          // Just ** means everything
          if (entry.isFile()) results.push(fullPath);
          if (entry.isDirectory()) {
            results.push(...await walkAndMatch(fullPath, patterns));
          }
        } else {
          // **/*.ext pattern
          if (entry.isFile() && matchPattern(entry.name, rest[0])) {
            results.push(fullPath);
          }
          if (entry.isDirectory()) {
            results.push(...await walkAndMatch(fullPath, patterns));
          }
        }
      } else if (matchPattern(entry.name, first)) {
        if (rest.length === 0) {
          if (entry.isFile()) results.push(fullPath);
        } else {
          if (entry.isDirectory()) {
            results.push(...await walkAndMatch(fullPath, rest));
          }
        }
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read
    return [];
  }

  return results;
}

function matchPattern(name: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(name);
}

async function copyReadmeWithFooter(readmePath: string, target: string) {
  const readme = await fs.readFile(readmePath, 'utf8');

  const footerPath = await findRootFile('FOOTER.md', process.cwd());

  let footer: string | null = null;
  if (footerPath) {
    try {
      footer = await fs.readFile(footerPath, 'utf8');
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  if (!footer) {
    console.log('[makage] no FOOTER.md found at workspace root, copying README without footer');
  }

  const combined = footer
    ? `${readme.trimEnd()}\n\n---\n\n${footer.trim()}\n`
    : readme;

  await fs.writeFile(target, combined, 'utf8');

  if (footer) {
    console.log(`[makage] copied README with footer: ${readmePath} + ${footerPath} -> ${target}`);
  } else {
    console.log(`[makage] copied ${readmePath} -> ${target}`);
  }
}
