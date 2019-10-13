#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const util = require('./util');
const resolve = require('resolve');
const yargs = require('yargs')
    .option('help', {
      alias: 'h',
      boolean: true,
      description: `Print usage information`,
    })
    .option('yarn', {
      boolean: true,
      description: `Use yarn package manager`,
    })
    .option('npm', {
      boolean: true,
      description: `Use npm package manager`,
    })
    .option('install', {
      boolean: true,
      description: 'Install missing or incorrect peerDependencies'
    })
    .check(argv => {
      if (argv.yarn && argv.npm) {
        throw new Error('Specify either --yarn or --npm but not both');
      }
      return true;
    });

if (yargs.argv.help) {
  process.exit(-2);
}

const PACKAGEJSON = 'package.json';
const NODEMODULES = 'node_modules';

const readFile = filename => JSON.parse(fs.readFileSync(filename).toString('utf-8'));

const visitedDeps = [];
const peerDeps = [];

const rootPackageJson = readFile(PACKAGEJSON);
checkInstalledPackage(".", null);

function getDependencies(packageJson) {
  const { name, dependencies = {}, peerDependencies = {} } = packageJson;
  return {
    name,
    dependencies: Object.keys(dependencies).map(name => ({ name, version: dependencies[ name ] })),
    peerDependencies: Object.keys(peerDependencies).map(name => ({ name, version: peerDependencies[ name ] })),
  };
}

function getPackagePath(basedir, packageName) {
  let packagePath;
  function packageFilter (pkg, pkgfile, dir) {
    packagePath = pkgfile;
    return pkg;
  }
  try {
    resolve.sync(packageName, { basedir, packageFilter });
  } catch (ignored) {
    // resolve.sync throws if no main: is present
    // Some packages (such as @types/*) do not have a main
    // As long as we have a packagePath, it's fine
  }
  return packagePath;
}

function checkInstalledPackage(basedir, packageName) {
  if (resolve.isCore(packageName)) {
    return;
  }

  const packagePath = packageName ? getPackagePath(basedir, packageName) : basedir;
  const packageJsonPath = path.join(packagePath, PACKAGEJSON);
  const packageJson = readFile(packageJsonPath);

  const { name, dependencies, peerDependencies } = getDependencies(packageJson);
  if (visitedDeps.includes(name)) {
    return;
  }
  visitedDeps.push(name);

  peerDependencies.forEach(peer => {
    peerDeps.push({ ...peer, depender: `${packageJson.name}@${packageJson.version}` });
  });

  dependencies.forEach(dependency => {
    checkInstalledPackage(packagePath, dependency.name)
  });
}

console.log('Peer Dependencies:');
peerDeps.forEach(dep => {
  return console.log(`${dep.depender} requires ${dep.name} ${dep.version}`);
});
console.log('');

const missingPeers = [];
const incorrectPeers = [];

function handleMissingPeerDependency(peerDependency) {
  missingPeers.push(peerDependency);
}

function handleIncorrectPeerDependency(peerDependency, installedVersion) {
  incorrectPeers.push({ ...peerDependency, installedVersion });
}

/**
 * Given a peerDependency, checks that the installed version of the package satisfies the required version
 */
function checkPeerDependency(peerDependency) {
  const pkgJsonFile = `${NODEMODULES}/${peerDependency.name}/${PACKAGEJSON}`;
  const exists = fs.existsSync(pkgJsonFile);
  if (!exists) {
    return handleMissingPeerDependency(peerDependency);
  }

  const installedVersion = readFile(pkgJsonFile).version;

  const declaredVersion = rootPackageJson.dependencies && rootPackageJson.dependencies[ peerDependency.name ];
  // ignore peer dependencies for yalc'd packages
  if (/file:\.yalc/.exec(declaredVersion)) {
    console.log(`${peerDependency.depender} depends on ${peerDependency.name} ${peerDependency.version}, but ignoring because ${peerDependency.name} is yalc'd`);
    return;
  }

  if (!semver.satisfies(installedVersion, peerDependency.version)) {
    handleIncorrectPeerDependency(peerDependency, installedVersion);
  }
}

peerDeps.forEach(checkPeerDependency);

if (missingPeers.length || incorrectPeers.length) {
  console.log('Problems found:');
  missingPeers.forEach(peer => console.error(`Missing peer dependency: ${peer.name}@${peer.version} depended on by ${peer.depender}`));
  incorrectPeers.forEach(peer =>
      console.error(`Incorrect peer dependency: ${peer.name}@${peer.installedVersion} installed but ${peer.depender} requires ${peer.version}.`));
  console.error();
} else {
  console.log('No problems found.')
}

function semverReverseSort(a, b) {
  const lt = semver.lt(a, b);
  const gt = semver.gt(a, b);
  if (!lt && !gt) {
    return 0;
  } else if (lt) {
    return 1;
  }
  return -1;
}

const adds = [];
const upgrades = [];

function findPossibleResolution(packageName, allPeerDeps, isMissing = false) {
  const requiredPeerVersions = allPeerDeps.filter(dep => dep.name === packageName);
  const rawVersionsInfo = util._exec(`npm view ${packageName} versions`, true).stdout;
  const availableVersions = JSON.parse(rawVersionsInfo.replace(/'/g, '"')).sort(semverReverseSort);

  const foundVer = availableVersions.find(ver => requiredPeerVersions.every(peerVer => semver.satisfies(ver, peerVer.version)));
  if (!foundVer) {
    const errorPrefix = `Unable to find a version of ${packageName} that satisfies the following peerDependencies:`;
    console.error();
    console.error(errorPrefix);
    requiredPeerVersions.forEach(peer => console.error(`${peer.depender} requires ${peer.name} ${peer.version}`));
    console.error();
    throw new Error(`${errorPrefix} ${requiredPeerVersions.map(x => x.version).join()}`);
  }

  console.log(`found ${packageName}@${foundVer} which satisfies ${requiredPeerVersions.map(x => x.version).join(',')}`);

  (isMissing ? adds : upgrades).push(`${packageName}@${foundVer}`);
}


const missingPackages = missingPeers.map(x => x.name).reduce((acc, x) => acc.includes(x) ? acc : acc.concat(x), []);
const incorrectPackages = incorrectPeers.map(x => x.name).reduce((acc, x) => acc.includes(x) ? acc : acc.concat(x), []);
if (missingPackages.length || incorrectPackages.length) {
  console.log('Searching for solutions:');
  missingPackages.forEach(peer => findPossibleResolution(peer, peerDeps, true));
  incorrectPackages.forEach(peer => findPossibleResolution(peer, peerDeps, false));
  console.log();
}

function getPackageManager() {
  if (yargs.argv.yarn) return 'yarn';
  if (yargs.argv.npm) return 'npm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
}
const packageManager = getPackageManager();

function getCommandLines() {
  const commands = [];
  if (packageManager === 'yarn') {
    if (adds.length) {
      commands.push(`yarn add ${adds.join(' ')}`);
    }
    if (upgrades.length) {
      commands.push(`yarn upgrade ${upgrades.join(' ')}`);
    }
  } else if (packageManager === 'npm') {
    commands.push(`npm install ${adds.concat(upgrades).join(' ')}`)
  }
  return commands;
}

const commandLines = getCommandLines();
if (commandLines.length) {
  console.log('Commands:');
  commandLines.forEach(command => {
    if (yargs.argv.install) {
      util._exec(command);
    } else {
      console.log(command);
    }
  });
}
