import { green, blue } from 'yanse';

import { readAndParsePackageJson } from "./package";

// Function to display the version information
export function displayVersion(): any {
  const pkg = readAndParsePackageJson();
  console.log(green(`Name: ${pkg.name}`));
  console.log(blue(`Version: ${pkg.version}`));
}


export function getVersion(): string {
  const pkg = readAndParsePackageJson();
  return pkg.version;
}
