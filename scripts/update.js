#!/usr/bin/env node

// THIS SCRIPT IS USED TO UPDATE THE DEPENDENCIES OF THE INTERNAL PACKAGES TO USE THE WORKSPACE PROTOCOL
// TODO make this a package

const fs = require('fs');
const path = require('path');

// Find all package.json files in the workspace
const packagesDir = path.join(__dirname, '../packages');
const dirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

const packageFiles = dirs
  .map(dir => path.join(dir, 'package.json'))
  .filter(file => fs.existsSync(path.join(packagesDir, file)));

// Build a set of internal package names
const internalPackages = new Set();
packageFiles.forEach(file => {
  const pkgPath = path.join(packagesDir, file);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (pkg.name) {
    internalPackages.add(pkg.name);
  }
});

console.log(`Found ${internalPackages.size} internal packages:`, Array.from(internalPackages));

// Update each package.json
let totalUpdates = 0;
packageFiles.forEach(file => {
  const pkgPath = path.join(packagesDir, file);
  const content = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(content);

  let modified = false;

  // Update dependencies
  ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(depType => {
    if (pkg[depType]) {
      Object.keys(pkg[depType]).forEach(depName => {
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
      });
    }
  });

  if (modified) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
});

console.log(`\n✅ Updated ${totalUpdates} dependencies to workspace:*`);
