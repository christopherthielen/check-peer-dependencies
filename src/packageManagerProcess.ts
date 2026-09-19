import * as fs from 'fs';
import * as path from 'path';

export type PackageManager = 'npm' | 'yarn';

// Windows .cmd shims require a shell. Launch the corresponding JS entry point
// with Node instead, supporting npm, Yarn Classic and Corepack installations.
export function getPackageManagerProcess(executable: PackageManager, args: string[]) {
  if (process.platform !== 'win32') return { executable, args };

  const entryPoints =
    executable === 'npm'
      ? [
          'node_modules/npm/bin/npm-cli.js',
          'node_modules/corepack/dist/npm.js',
          '../npm/bin/npm-cli.js',
          '../corepack/dist/npm.js',
        ]
      : [
          'node_modules/yarn/bin/yarn.js',
          'node_modules/corepack/dist/yarn.js',
          'yarn.js',
          '../yarn/bin/yarn.js',
          '../corepack/dist/yarn.js',
        ];
  const pathValue = process.env.PATH || process.env.Path || '';
  const directories = pathValue.split(path.delimiter).filter(Boolean);
  for (const directory of directories) {
    const dir = directory.replace(/^"(.*)"$/, '$1');
    if (!fs.existsSync(path.join(dir, `${executable}.cmd`))) continue;
    const script = entryPoints.map((entry) => path.resolve(dir, entry)).find((entry) => fs.existsSync(entry));
    if (script) return { executable: process.execPath, args: [script, ...args] };
    // Do not skip a selected custom shim and silently run another installation.
    break;
  }
  throw new Error(`Cannot locate a shell-free ${executable} JavaScript entry point on PATH`);
}
