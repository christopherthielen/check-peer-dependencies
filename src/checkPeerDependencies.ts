#!/usr/bin/env node
import * as semver from 'semver';

import { exec } from 'shelljs';
import { CliOptions } from './cli';
import { getCommandLines } from './packageManager';
import { Dependency, gatherPeerDependencies, getInstalledVersion, isSameDep } from './packageUtils';
import { findPossibleResolutions, Resolution } from './solution';

function getAllNestedPeerDependencies(options: CliOptions): Dependency[] {
  const gatheredDependencies = gatherPeerDependencies(".", options);

  function applySemverInformation(dep: Dependency): Dependency {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion ? semver.satisfies(installedVersion, dep.version, { includePrerelease: true }) : false;
    const isYalc = !!/-[a-f0-9]+-yalc$/.exec(installedVersion);

    return { ...dep, installedVersion, semverSatisfies, isYalc };
  }

  return gatheredDependencies.map(applySemverInformation);
}

let recursiveCount = 0;

const reportPeerDependencyStatus = (dep: Dependency, byDepender: boolean, showSatisfiedDep: boolean, showOptionalDep: boolean) => {
  const message = byDepender ?
      `${dep.depender.name}@${dep.depender.version} requires ${dep.name} ${dep.version}` :
      `${dep.name} ${dep.version} is required by ${dep.depender.name}@${dep.depender.version}`;

  if (dep.semverSatisfies) {
    if (showSatisfiedDep) {
      console.log(`  ✅  ${message} (${dep.installedVersion} is installed)`);
    }
  } else if (dep.isYalc) {
    console.log(`  ☑️  ${message} (${dep.installedVersion} is installed via yalc)`);
  } else if (dep.installedVersion && dep.isPeerOptionalDependency) {
    if (showOptionalDep) {
      console.log(`  ☑️  ${message}) OPTIONAL (${dep.installedVersion} is installed)`);
    }
  } else if (dep.installedVersion) {
    console.log(`  ❌  ${message}) (${dep.installedVersion} is installed)`);
  } else if (dep.isPeerOptionalDependency) {
    if (showOptionalDep) {
      console.log(`  ☑️  ${message} OPTIONAL (${dep.name} is not installed)`);
    }
  } else {
    console.log(`  ❌  ${message} (${dep.name} is not installed)`);
  }
};

function findSolutions(problems: Dependency[], allNestedPeerDependencies: Dependency[]) {
  console.log();
  console.log(`Searching for solutions for ${problems.length} missing dependencies...`);
  console.log();
  const resolutions: Resolution[] = findPossibleResolutions(problems, allNestedPeerDependencies);
  const resolutionsWithSolutions = resolutions.filter(r => r.resolution);
  const nosolution = resolutions.filter(r => !r.resolution);

  nosolution.forEach(solution => {
    const name = solution.problem.name;
    const errorPrefix = `Unable to find a version of ${name} that satisfies the following peerDependencies:`;
    const peerDepRanges = allNestedPeerDependencies.filter(dep => dep.name === name)
        .reduce((acc, dep) => acc.includes(dep.version) ? acc : acc.concat(dep.version), []);
    console.error(`  ❌  ${errorPrefix} ${peerDepRanges.join(" and ")}`)
  });


  if (nosolution.length > 0) {
    console.error();
  }

  return { resolutionsWithSolutions, nosolution };
}

function installPeerDependencies(commandLines: any[], options: CliOptions, nosolution: Resolution[], packageManager: string) {
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
  return;
}

function report(options: CliOptions, allNestedPeerDependencies: Dependency[]) {
  if (options.orderBy === 'depender') {
    allNestedPeerDependencies.sort((a, b) => `${a.depender}${a.name}`.localeCompare(`${b.depender}${b.name}`));
  } else if (options.orderBy == 'dependee') {
    allNestedPeerDependencies.sort((a, b) => `${a.name}${a.depender}`.localeCompare(`${b.name}${b.depender}`));
  }

  allNestedPeerDependencies.forEach(dep => {
    const isUnsatisfied = (dep: Dependency) => !dep.semverSatisfies && !dep.isYalc;
    const relatedPeerDeps = allNestedPeerDependencies.filter(other => other.name === dep.name && other !== dep);
    const showIfSatisfied = options.verbose || relatedPeerDeps.some(isUnsatisfied);
    const showOptionalDep = options.verbose;
    reportPeerDependencyStatus(dep, options.orderBy === 'depender', showIfSatisfied, showOptionalDep);
  });
}

export function checkPeerDependencies(packageManager: string, options: CliOptions) {
  const allNestedPeerDependencies = getAllNestedPeerDependencies(options);
  report(options, allNestedPeerDependencies);

  const problems = allNestedPeerDependencies.filter(dep => !dep.semverSatisfies && !dep.isYalc && !dep.isPeerOptionalDependency);

  if (!problems.length) {
    console.log('  ✅  All peer dependencies are met');
    return;
  }

  if (options.install) {
    const { nosolution, resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      return installPeerDependencies(commandLines, options, nosolution, packageManager);
    }
  } else if (options.findSolutions) {
    const { resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      console.log();
      console.log(`Install peerDependencies using ${commandLines.length > 1 ? 'these commands:' : 'this command'}:`);
      console.log();
      commandLines.forEach(command => console.log(command));
      console.log();
    }
  } else {
    console.log();
    console.log(`Search for solutions using this command:`);
    console.log();
    console.log(`npx check-peer-dependencies --findSolutions`);
    console.log();
    console.log(`Install peerDependencies using this command:`);
    console.log();
    console.log(`npx check-peer-dependencies --install`);
    console.log();
  }

  process.exit(1);
}
