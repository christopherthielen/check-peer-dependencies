import * as fs from "fs";
import { Resolution } from './solution';

export function getPackageManager(forceYarn: boolean, forceNpm: boolean) {
  if (forceYarn) return 'yarn';
  if (forceNpm) return 'npm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
}

export function getCommandLines(packageManager: string, resolutions: Resolution[]) {
  const installs = resolutions.filter(r => r.resolution && r.resolutionType === 'install').map(r => r.resolution);
  const devInstalls = resolutions.filter(r => r.resolution && r.resolutionType === 'devInstall').map(r => r.resolution);
  const upgrades = resolutions.filter(r => r.resolution && r.resolutionType === 'upgrade').map(r => r.resolution);

  const commands = [];
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
  } else if (packageManager === 'npm' && (installs.length || upgrades.length || devInstalls.length)) {
    // if (installs.length || upgrades.length) {
    //   commands.push(`npm install ${installs.concat(upgrades).join(' ')}`);
    // }
    // if (devInstalls.length) {
    //   commands.push(`npm install -D ${devInstalls}`);
    // }
    commands.push(installs.concat(upgrades, devInstalls).join(' '));
  }
  return commands;
}
