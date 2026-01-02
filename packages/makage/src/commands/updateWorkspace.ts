import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { parse as parseYaml } from 'yaml';

const DEPENDENCY_TYPES = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
] as const;

interface PnpmWorkspace {
  packages?: string[];
}

export async function runUpdateWorkspace(_args: string[]) {
  const cwd = process.cwd();
  const workspaceFile = path.join(cwd, 'pnpm-workspace.yaml');

  // Read and parse pnpm-workspace.yaml
  let workspaceConfig: PnpmWorkspace;
  try {
    const content = await fs.readFile(workspaceFile, 'utf-8');
    workspaceConfig = parseYaml(content) as PnpmWorkspace;
  } catch {
    throw new Error('No "pnpm-workspace.yaml" found. Run this command from the monorepo root.');
  }

  const patterns = workspaceConfig.packages;
  if (!patterns || patterns.length === 0) {
    throw new Error('No package patterns found in pnpm-workspace.yaml');
  }

  console.log(`[makage] Workspace patterns:`, patterns);

  // Find all package.json files matching the workspace patterns
  const packageJsonPatterns = patterns.map(p => {
    // Convert workspace pattern to package.json glob
    // e.g., 'packages/*' -> 'packages/*/package.json'
    const normalized = p.replace(/\/?\*\*?$/, '');
    return `${normalized}/*/package.json`;
  });

  const packageFiles = await glob(packageJsonPatterns, {
    cwd,
    absolute: false,
    ignore: ['**/node_modules/**']
  });

  if (packageFiles.length === 0) {
    console.log('[makage] No packages found matching workspace patterns');
    return;
  }

  // Build a set of internal package names
  const internalPackages = new Set<string>();
  for (const file of packageFiles) {
    const pkgPath = path.join(cwd, file);
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name) {
      internalPackages.add(pkg.name);
    }
  }

  console.log(`[makage] Found ${internalPackages.size} internal packages:`, Array.from(internalPackages));

  // Update each package.json
  let totalUpdates = 0;
  for (const file of packageFiles) {
    const pkgPath = path.join(cwd, file);
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    let modified = false;

    // Update dependencies
    for (const depType of DEPENDENCY_TYPES) {
      if (pkg[depType]) {
        for (const depName of Object.keys(pkg[depType])) {
          if (internalPackages.has(depName)) {
            const currentVersion = pkg[depType][depName];
            // Skip if already using workspace protocol
            if (!currentVersion.startsWith('workspace:')) {
              pkg[depType][depName] = 'workspace:*';
              console.log(`  ${pkg.name}: ${depName} ${currentVersion} -> workspace:*`);
              modified = true;
              totalUpdates++;
            }
          }
        }
      }
    }

    if (modified) {
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }

  console.log(`\n[makage] ✅ Updated ${totalUpdates} dependencies to workspace:*`);
}
