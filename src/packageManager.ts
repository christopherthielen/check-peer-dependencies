import * as fs from "fs";

export function getPackageManager(forceYarn: boolean, forceNpm: boolean) {
  if (forceYarn) return 'yarn';
  if (forceNpm) return 'npm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
}

export function getCommandLines(packageManager: string, installs: string[], upgrades: string[]) {
  const commands = [];
  if (packageManager === 'yarn') {
    if (installs.length) {
      commands.push(`yarn add ${installs.join(' ')}`);
    }
    if (upgrades.length) {
      commands.push(`yarn upgrade ${upgrades.join(' ')}`);
    }
  } else if (packageManager === 'npm' && (installs.length || upgrades.length)) {
    commands.push(`npm install ${installs.concat(upgrades).join(' ')}`)
  }
  return commands;
}
