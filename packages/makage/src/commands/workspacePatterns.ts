import { glob } from 'glob';

/**
 * Translate a pnpm workspace `packages:` pattern into a `package.json` glob.
 *
 * pnpm treats every pattern as a directory glob and looks for a manifest in
 * each matched directory, so the only transformation needed is appending
 * `/package.json` — `*` and `**` keep their glob meaning wherever they appear
 * in the pattern (`functions/*\/handlers/*`, `functions/*\/pages`, ...).
 */
export function packagePatternToGlob(pattern: string): string {
  const normalized = pattern.trim().replace(/\/+$/, '');

  if (normalized === '' || normalized === '.') return 'package.json';
  if (normalized === '**') return '**/package.json';

  return `${normalized}/package.json`;
}

/**
 * Expand pnpm workspace patterns into the manifest paths they match, honouring
 * `!`-prefixed exclusions the way pnpm does.
 */
export async function findWorkspacePackageFiles(cwd: string, patterns: string[]): Promise<string[]> {
  const include: string[] = [];
  const exclude: string[] = [];

  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (trimmed.startsWith('!')) {
      exclude.push(packagePatternToGlob(trimmed.slice(1)));
    } else {
      include.push(packagePatternToGlob(trimmed));
    }
  }

  if (include.length === 0) return [];

  const files = await glob(include, {
    cwd,
    absolute: false,
    ignore: ['**/node_modules/**', ...exclude]
  });

  return files;
}
