import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { Resolution } from './solution';
import { getPackageManagerProcess, PackageManager } from './packageManagerProcess';

export function getPackageManager(forceYarn: boolean, forceNpm: boolean) {
  if (forceYarn) return 'yarn';
  if (forceNpm) return 'npm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
}

export interface InstallCommand {
  executable: PackageManager;
  args: string[];
}

// POSIX shell formatting is for display/copying only. Never execute this string.
export function formatCommand(command: InstallCommand): string {
  const quote = (arg: string) =>
    /^[a-zA-Z0-9_@%+=:,./-]+$/.test(arg) ? arg : "'" + arg.replace(/'/g, "'\"'\"'") + "'";
  return [command.executable, ...command.args].map(quote).join(' ');
}

const ALLOWED_EXECUTABLES = ['npm', 'yarn', process.execPath];

export function runInstallCommand(command: InstallCommand): void {
  const invocation = getPackageManagerProcess(command.executable, command.args);
  if (!ALLOWED_EXECUTABLES.includes(invocation.executable)) {
    throw new Error(`Refusing to run unexpected executable: ${invocation.executable}`);
  }
  const result = spawnSync(invocation.executable, invocation.args, { stdio: 'inherit', shell: false });
  if (result.error) {
    throw new Error(`Unable to start ${command.executable}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command.executable} failed (${result.signal ? `signal ${result.signal}` : `exit ${result.status}`})`
    );
  }
}

export function getInstallCommands(packageManager: string, resolutions: Resolution[]): InstallCommand[] {
  const installs = resolutions.filter((r) => r.resolution && r.resolutionType === 'install').map((r) => r.resolution);
  const devInstalls = resolutions
    .filter((r) => r.resolution && r.resolutionType === 'devInstall')
    .map((r) => r.resolution);
  const upgrades = resolutions.filter((r) => r.resolution && r.resolutionType === 'upgrade').map((r) => r.resolution);

  const commands: InstallCommand[] = [];
  if (packageManager === 'yarn') {
    if (installs.length) {
      commands.push({ executable: 'yarn', args: ['add', '--', ...installs] });
    }
    if (devInstalls.length) {
      commands.push({ executable: 'yarn', args: ['add', '-D', '--', ...devInstalls] });
    }
    if (upgrades.length) {
      commands.push({ executable: 'yarn', args: ['upgrade', '--', ...upgrades] });
    }
  } else if (packageManager === 'npm' && (installs.length || upgrades.length || devInstalls.length)) {
    if (installs.length || upgrades.length) {
      commands.push({ executable: 'npm', args: ['install', '--', ...installs, ...upgrades] });
    }
    if (devInstalls.length) {
      commands.push({ executable: 'npm', args: ['install', '-D', '--', ...devInstalls] });
    }
  }
  return commands;
}

export function getCommandLines(packageManager: string, resolutions: Resolution[]): string[] {
  return getInstallCommands(packageManager, resolutions).map(formatCommand);
}
