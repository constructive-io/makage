import path from 'node:path';
import { runCopy } from './copy';
import { runReadmeFooter } from './readmeFooter';
import { findRootFile } from './workspace';

export async function runAssets(_args: string[]) {
  const licensePath = await findRootFile('LICENSE', process.cwd());

  if (licensePath) {
    await runCopy([licensePath, 'package.json', 'dist', '--flat']);
  } else {
    await runCopy(['package.json', 'dist', '--flat']);
    console.log('[makage] no LICENSE found at workspace root, skipping');
  }

  const footerPath = await findRootFile('FOOTER.md', process.cwd());

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
