import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function canUseDeclarationMap(tsconfigPath: string): boolean {
  const fullPath = resolve(process.cwd(), tsconfigPath);
  if (!existsSync(fullPath)) {
    return true; // Default tsconfig, assume declaration is enabled
  }
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const tsconfig = JSON.parse(content);
    // declarationMap requires declaration or composite to be true
    // If declaration is explicitly false, we can't use declarationMap
    if (tsconfig.compilerOptions?.declaration === false) {
      return false;
    }
    return true;
  } catch {
    return true; // If we can't read/parse, assume it's fine
  }
}

export async function runBuildTs(args: string[]) {
  const isDev = args.includes('--dev');

  const tscArgs = isDev ? ['--declarationMap'] : [];
  const canUseEsmDeclarationMap = isDev && canUseDeclarationMap('tsconfig.esm.json');
  const esmArgs = ['-p', 'tsconfig.esm.json', ...(canUseEsmDeclarationMap ? ['--declarationMap'] : [])];

  console.log(`[makage] tsc (CJS)${isDev ? ' [dev mode]' : ''}`);
  await run('tsc', tscArgs);

  console.log(`[makage] tsc (ESM)${isDev ? ' [dev mode]' : ''}`);
  await run('tsc', esmArgs);
}
