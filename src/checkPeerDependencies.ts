#!/usr/bin/env node
import * as semver from 'semver';

import { exec } from 'shelljs';
import { CliOptions } from './cli';
import { getCommandLines, PackageManager } from './packageManager';
import {
  Dependency,
  gatherPeerDependencies,
  getInstalledVersion,
  isSameDep,
  uniqueVersionsForPackage,
} from './packageUtils';
import { findPossibleResolutions, Resolution } from './solution';

const PACKAGE_NAME = '@lucavb/check-peer-dependencies';
const RECURSION_LIMIT = 5;

function getAllNestedPeerDependencies(options: CliOptions): Dependency[] {
  const gatheredDependencies = gatherPeerDependencies('.', options);

  function applySemverInformation(dep: Dependency): Dependency {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion
      ? semver.satisfies(installedVersion, dep.version, { includePrerelease: true })
      : false;
    const isYalc = installedVersion?.endsWith('-yalc') ?? false;

    return { ...dep, installedVersion, semverSatisfies, isYalc };
  }

  function applyIgnoreInformation(dep: Dependency): Dependency {
    const isIgnored = options.ignore.includes(dep.name);
    return { ...dep, isIgnored };
  }

  return gatheredDependencies.map(applySemverInformation).map(applyIgnoreInformation);
}

let recursiveCount = 0;

const isProblem = (dep: Dependency, ignoreOptional: boolean): boolean =>
  !dep.semverSatisfies &&
  !dep.isIgnored &&
  !dep.isYalc &&
  !(ignoreOptional && dep.isPeerOptionalDependency) &&
  (!dep.isPeerOptionalDependency || !!dep.installedVersion);

const reportPeerDependencyStatus = (
  dep: Dependency,
  byDepender: boolean,
  showSatisfiedDep: boolean,
  verbose: boolean
): void => {
  const message = byDepender
    ? `${dep.depender.name}@${dep.depender.version} requires ${dep.name} ${dep.version}`
    : `${dep.name} ${dep.version} is required by ${dep.depender.name}@${dep.depender.version}`;

  if (dep.semverSatisfies) {
    if (showSatisfiedDep) {
      console.log(`  ✅  ${message} (${dep.installedVersion} is installed)`);
    }
  } else if (dep.isYalc) {
    console.log(`  ☑️  ${message} (${dep.installedVersion} is installed via yalc)`);
  } else if (dep.isIgnored) {
    if (verbose) {
      console.log(`  ☑️   ${message} IGNORED (${dep.name} is not installed)`);
    }
  } else if (dep.installedVersion) {
    if (dep.isPeerOptionalDependency) {
      console.log(`  ❌  ${message} OPTIONAL (${dep.installedVersion} is installed)`);
    } else {
      console.log(`  ❌  ${message} (${dep.installedVersion} is installed)`);
    }
  } else if (dep.isPeerOptionalDependency) {
    if (verbose) {
      console.log(`  ☑️   ${message} OPTIONAL (${dep.name} is not installed)`);
    }
  } else {
    console.log(`  ❌  ${message} (${dep.name} is not installed)`);
  }
};

function findSolutions(
  problems: Dependency[],
  allNestedPeerDependencies: Dependency[]
): { resolutionsWithSolutions: Resolution[]; nosolution: Resolution[] } {
  console.log();
  console.log(`Searching for solutions for ${problems.length} missing dependencies...`);
  console.log();
  const resolutions = findPossibleResolutions(problems, allNestedPeerDependencies);
  const resolutionsWithSolutions = resolutions.filter((r) => r.resolution);
  const nosolution = resolutions.filter((r) => !r.resolution);

  nosolution.forEach((solution) => {
    const name = solution.problem.name;
    const errorPrefix = `Unable to find a version of ${name} that satisfies the following peerDependencies:`;
    const peerDepRanges = uniqueVersionsForPackage(allNestedPeerDependencies, name);
    console.error(`  ❌  ${errorPrefix} ${peerDepRanges.join(' and ')}`);
  });

  if (nosolution.length > 0) {
    console.error();
  }

  return { resolutionsWithSolutions, nosolution };
}

function installPeerDependencies(
  commandLines: string[],
  options: CliOptions,
  nosolution: Resolution[],
  packageManager: PackageManager
): void {
  console.log('Installing peerDependencies...');
  console.log();
  commandLines.forEach((command) => {
    console.log(`$ ${command}`);
    exec(command);
    console.log();
  });

  const newProblems = getAllNestedPeerDependencies(options)
    .filter((dep) => isProblem(dep, options.ignoreOptional))
    .filter((dep) => !nosolution.some((x) => isSameDep(x.problem, dep)));

  if (nosolution.length === 0 && newProblems.length === 0) {
    console.log('All peer dependencies are met');
  }

  if (newProblems.length > 0) {
    console.log(`Found ${newProblems.length} new unmet peerDependencies...`);
    if (++recursiveCount < RECURSION_LIMIT) {
      checkPeerDependencies(packageManager, options);
      return;
    }
    console.error(`Recursion limit reached (${RECURSION_LIMIT})`);
    process.exit(5);
  }
}

function report(options: CliOptions, allNestedPeerDependencies: Dependency[]): void {
  if (options.orderBy === 'depender') {
    allNestedPeerDependencies.sort((a, b) =>
      `${a.depender.name}${a.name}`.localeCompare(`${b.depender.name}${b.name}`)
    );
  } else {
    allNestedPeerDependencies.sort((a, b) =>
      `${a.name}${a.depender.name}`.localeCompare(`${b.name}${b.depender.name}`)
    );
  }

  allNestedPeerDependencies.forEach((dep) => {
    const relatedPeerDeps = allNestedPeerDependencies.filter((other) => other.name === dep.name && other !== dep);
    const showIfSatisfied =
      options.verbose || relatedPeerDeps.some((related) => isProblem(related, options.ignoreOptional));
    reportPeerDependencyStatus(dep, options.orderBy === 'depender', showIfSatisfied, options.verbose);
  });
}

export function checkPeerDependencies(packageManager: PackageManager, options: CliOptions): void {
  const allNestedPeerDependencies = getAllNestedPeerDependencies(options);
  report(options, allNestedPeerDependencies);

  const problems = allNestedPeerDependencies.filter((dep) => isProblem(dep, options.ignoreOptional));

  if (!problems.length) {
    console.log('  ✅  All peer dependencies are met');
    return;
  }

  if (options.install) {
    const { nosolution, resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      installPeerDependencies(commandLines, options, nosolution, packageManager);
    }
    return;
  }

  if (options.findSolutions) {
    const { resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      console.log();
      console.log(`Install peerDependencies using ${commandLines.length > 1 ? 'these commands:' : 'this command'}:`);
      console.log();
      commandLines.forEach((command) => console.log(command));
      console.log();
    }
    return;
  }

  console.log();
  console.log('Search for solutions using this command:');
  console.log();
  console.log(`npx ${PACKAGE_NAME} --findSolutions`);
  console.log();
  console.log('Install peerDependencies using this command:');
  console.log();
  console.log(`npx ${PACKAGE_NAME} --install`);
  console.log();

  process.exit(1);
}
