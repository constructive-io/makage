import fs from 'node:fs/promises';

export async function runClean(paths: string[]) {
  const pathsToClean = paths.length ? paths : ['dist'];

  for (const p of pathsToClean) {
    await fs.rm(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    console.log(`[makage] removed ${p}`);
  }
}
