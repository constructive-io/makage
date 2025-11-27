#!/usr/bin/env node
import { runCopy } from './commands/copy';
import { runClean } from './commands/clean';
import { runReadmeFooter } from './commands/readmeFooter';
import { runAssets } from './commands/assets';
import { runBuild } from './commands/build';
import { runBuildTs } from './commands/buildTs';
import { runUpdateWorkspace } from './commands/updateWorkspace';
import { runTest } from './commands/testCommand';

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
      case 'build':
        await runBuild(rest);
        break;
      case 'build-ts':
        await runBuildTs(rest);
        break;
      case 'update-workspace':
        await runUpdateWorkspace(rest);
        break;
      case 'test':
        await runTest(rest);
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
  makage build [--dev]            (clean + build-ts + assets)
  makage clean [path...]          (defaults to "dist")
  makage copy [...sources] <dest> [--flat] [--footer]
  makage readme-footer --source <file> --footer <file> --dest <file>
  makage assets
  makage build-ts [--dev]
  makage update-workspace
  makage test [--runner <cmd>] [--watch] [-- <args...>]
`);
}

main();
