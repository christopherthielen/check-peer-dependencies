#!/usr/bin/env node
import * as semver from 'semver';

import { exec } from 'shelljs';
import { CliOptions } from './cli';
import { getCommandLines } from './packageManager';
import { Dependency, gatherPeerDependencies, getInstalledVersion } from './packageUtils';
import { findPossibleResolutions } from './solution';

function getAllNestedPeerDependencies(options: CliOptions) {
  const gatheredDependencies = gatherPeerDependencies(".", options);

  const allNestedPeerDependencies: Dependency[] = gatheredDependencies.map(dep => {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion ? semver.satisfies(installedVersion, dep.version) : false;
    const isYalc = !!/-[a-f0-9]+-yalc$/.exec(installedVersion);

    return { ...dep, installedVersion, semverSatisfies, isYalc };
  });

  return allNestedPeerDependencies.sort((a, b) => `${a.depender}${a.name}`.localeCompare(`${b.depender}${b.name}`));
}

let recursiveCount = 0;

export function checkPeerDependencies(packageManager: string, options: CliOptions) {
  const allNestedPeerDependencies = getAllNestedPeerDependencies(options);

  allNestedPeerDependencies.forEach(dep => {
    if (dep.semverSatisfies) {
      console.log(`✅  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.installedVersion} is installed)`);
    } else if (dep.isYalc) {
      console.log(`☑️  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.installedVersion} is installed via yalc)`);
    } else if (dep.installedVersion) {
      console.log(`❌  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.installedVersion} is installed)`);
    } else {
      console.log(`❌  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.name} is not installed)`);
    }
  });

  const problems = allNestedPeerDependencies.filter(dep => !dep.semverSatisfies && !dep.isYalc);

  if (!problems.length) {
    console.log('No problems found!');
    return;
  }

  console.log();
  console.log('Searching for solutions...');
  console.log();
  const resolutions = findPossibleResolutions(problems, allNestedPeerDependencies);
  const installs = resolutions.filter(r => r.resolution && r.resolutionType === 'install').map(r => r.resolution);
  const upgrades = resolutions.filter(r => r.resolution && r.resolutionType === 'upgrade').map(r => r.resolution);
  const nosolution = resolutions.filter(r => !r.resolution);

  nosolution.forEach(solution => {
    const name = solution.problem.name;
    const errorPrefix = `Unable to find a version of ${name} that satisfies the following peerDependencies:`;
    const peerDepRanges = allNestedPeerDependencies.filter(dep => dep.name === name)
        .reduce((acc, dep) => acc.includes(dep.version) ? acc : acc.concat(dep.version), []);
    console.error(`❌  ${errorPrefix} ${peerDepRanges.join(" and ")}`)
  });


  if (nosolution.length > 0) {
    console.error();
  }

  const commandLines = getCommandLines(packageManager, installs, upgrades);
  if (options.install && commandLines.length > 0) {
    console.log('Installing peerDependencies...');
    console.log();
    commandLines.forEach(command => {
      console.log(`$ ${command}`);
      exec(command);
      console.log();
    });

    const newUnsatisfiedDeps = getAllNestedPeerDependencies(options)
        .filter(dep => !dep.semverSatisfies)
        .filter(dep => !nosolution.some(x => isSameDep(x.problem, dep)));

    if (nosolution.length === 0 && newUnsatisfiedDeps.length === 0) {
      console.log('All peer dependencies are met');
    }

    if (newUnsatisfiedDeps.length > 0) {
      console.log(`Found ${newUnsatisfiedDeps.length} new unmet peerDependencies...`);
      if (++recursiveCount < 5) {
        return checkPeerDependencies(packageManager, options);
      } else {
        console.error('Recursion limit reached (5)');
        process.exit(5)
      }
    }

  } else if (commandLines.length > 0) {
    console.log(`Install peerDependencies using ${commandLines.length > 1 ? 'these commands:' : 'this command'}:`);
    console.log();
    commandLines.forEach(command => console.log(command));
    console.log();
  }
}


function isSameDep(a: Dependency, b: Dependency) {
  const keys: Array<keyof Dependency> = [
    "name",
    "version",
    "depender",
    "dependerPath",
    "dependerVersion",
    "installedVersion",
    "semverSatisfies",
    "isYalc"
  ];

  return keys.every(key => a[key] === b[key]);
}
