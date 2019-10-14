#!/usr/bin/env node
import * as semver from 'semver';

import { exec } from 'shelljs';
import { getCommandLines } from './packageManager';
import { Dependency, gatherPeerDependencies, getInstalledVersion } from './packageUtils';
import { findPossibleResolutions } from './solution';

export function checkPeerDependencies(packageManager: string, installMissingPeerDependencies: boolean) {
  const gatheredDependencies = gatherPeerDependencies(".");
  const allNestedPeerDependencies: Dependency[] = gatheredDependencies.map(dep => {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion ? semver.satisfies(installedVersion, dep.version) : false;
    return { ...dep, installedVersion, semverSatisfies };
  }).sort((a, b) => `${a.name}${a.depender}`.localeCompare(`${b.name}${b.depender}`));

  allNestedPeerDependencies.forEach(dep => {
    if (dep.semverSatisfies) {
      console.log(`✅  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.installedVersion} is installed)`);
    } else if (dep.installedVersion) {
      console.log(`❌  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.installedVersion} is installed)`);
    } else {
      console.log(`❌  ${dep.depender}@${dep.dependerVersion} requires ${dep.name} ${dep.version} (${dep.name} is not installed)`);
    }
  });

  const problems = allNestedPeerDependencies.filter(dep => !dep.semverSatisfies && !/file:\.yalc/.exec(dep.dependerVersion));

  if (!problems.length) {
    console.log('No problems found!');
    return;
  }

  console.log();
  console.log('Searching for solutions:');
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


  if (nosolution.length) {
    console.error();
  }

  if (installMissingPeerDependencies) {
    console.log('Installing peerDependencies...');
    getCommandLines(packageManager, installs, upgrades).forEach(command => exec(command));
  } else {
    getCommandLines(packageManager, installs, upgrades).forEach(command => console.log(command));
    console.log();
  }
}

