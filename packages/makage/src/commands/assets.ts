import fs from 'node:fs/promises';
import path from 'node:path';
import { runCopy } from './copy';
import { runReadmeFooter } from './readmeFooter';
import { findWorkspaceRoot } from './workspace';

async function resolveRootFile(root: string | null, filename: string): Promise<string | null> {
  if (!root) return null;
  const filePath = path.join(root, filename);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

export async function runAssets(_args: string[]) {
  const root = await findWorkspaceRoot(process.cwd());
  const licensePath = await resolveRootFile(root, 'LICENSE');
  const footerPath = await resolveRootFile(root, 'FOOTER.md');

  if (licensePath) {
    await runCopy([licensePath, 'package.json', 'dist', '--flat']);
  } else {
    await runCopy(['package.json', 'dist', '--flat']);
    console.log('[makage] no LICENSE found at workspace root, skipping');
  }

  if (footerPath) {
    await runReadmeFooter([
      '--source', 'README.md',
      '--footer', footerPath,
      '--dest', path.join('dist', 'README.md')
    ]);
  } else {
    await runCopy(['README.md', 'dist', '--flat']);
  }
}
