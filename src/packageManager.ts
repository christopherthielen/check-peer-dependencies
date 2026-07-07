import * as fs from 'fs';
import { Resolution } from './solution';

export type PackageManager = 'yarn' | 'npm';

export function getPackageManager(forceYarn: boolean, forceNpm: boolean): PackageManager {
  if (forceYarn) return 'yarn';
  if (forceNpm) return 'npm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

export function getCommandLines(packageManager: PackageManager, resolutions: Resolution[]): string[] {
  const installs = resolutions
    .filter((r) => r.resolution && r.resolutionType === 'install')
    .map((r) => r.resolution as string);
  const devInstalls = resolutions
    .filter((r) => r.resolution && r.resolutionType === 'devInstall')
    .map((r) => r.resolution as string);
  const upgrades = resolutions
    .filter((r) => r.resolution && r.resolutionType === 'upgrade')
    .map((r) => r.resolution as string);

  const commands: string[] = [];

  if (packageManager === 'yarn') {
    if (installs.length) {
      commands.push(`yarn add ${installs.join(' ')}`);
    }
    if (devInstalls.length) {
      commands.push(`yarn add -D ${devInstalls.join(' ')}`);
    }
    if (upgrades.length) {
      commands.push(`yarn upgrade ${upgrades.join(' ')}`);
    }
  } else if (installs.length || upgrades.length || devInstalls.length) {
    if (installs.length || upgrades.length) {
      commands.push(`npm install ${installs.concat(upgrades).join(' ')}`);
    }
    if (devInstalls.length) {
      commands.push(`npm install -D ${devInstalls.join(' ')}`);
    }
  }

  return commands;
}
