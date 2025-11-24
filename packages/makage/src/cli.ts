#!/usr/bin/env node
import { runCopy } from './commands/copy';
import { runClean } from './commands/clean';
import { runReadmeFooter } from './commands/readmeFooter';
import { runAssets } from './commands/assets';
import { runBuildTs } from './commands/buildTs';
import { runUpdateWorkspace } from './commands/updateWorkspace';

const [, , cmd, ...rest] = process.argv;

async function main() {
  try {
    switch (cmd) {
      case 'copy':
        await runCopy(rest);
        break;
      case 'clean':
        await runClean(rest);
        break;
      case 'readme-footer':
        await runReadmeFooter(rest);
        break;
      case 'assets':
        await runAssets(rest);
        break;
      case 'build-ts':
        await runBuildTs(rest);
        break;
      case 'update-workspace':
        await runUpdateWorkspace(rest);
        break;
      case '-h':
      case '--help':
      default:
        printHelp();
        process.exit(cmd ? 1 : 0);
    }
  } catch (err) {
    console.error('[makage] error:', (err as Error).message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
makage – tiny build helper

Usage:
  makage clean [path...]          (defaults to "dist")
  makage copy [...sources] <dest> [--flat]
  makage readme-footer --source <file> --footer <file> --dest <file>
  makage assets
  makage build-ts
  makage update-workspace
`);
}

main();
