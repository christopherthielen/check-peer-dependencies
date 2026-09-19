#!/usr/bin/env node
import * as semver from 'semver';

import { CliOptions } from './cli';
import { formatCommand, getInstallCommands, InstallCommand, runInstallCommand } from './packageManager';
import { Dependency, gatherPeerDependencies, getInstalledVersion, isSameDep } from './packageUtils';
import { findPossibleResolutions, Resolution } from './solution';
import { log, logError } from './output';

function getAllNestedPeerDependencies(options: CliOptions): Dependency[] {
  const gatheredDependencies = gatherPeerDependencies('.', options);

  function applySemverInformation(dep: Dependency): Dependency {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion
      ? semver.satisfies(installedVersion, dep.version, { includePrerelease: true })
      : false;
    const isYalc = installedVersion?.endsWith('-yalc');

    return { ...dep, installedVersion, semverSatisfies, isYalc };
  }

  function applyIgnoreInformation(dep: Dependency): Dependency {
    const isIgnored = options.ignore.includes(dep.name);
    return { ...dep, isIgnored };
  }

  return gatheredDependencies.map(applySemverInformation).map(applyIgnoreInformation);
}

let recursiveCount = 0;

const isProblem = (dep: Dependency) =>
  !dep.semverSatisfies && !dep.isIgnored && !dep.isYalc && (!dep.isPeerOptionalDependency || !!dep.installedVersion);

const reportPeerDependencyStatus = (
  dep: Dependency,
  byDepender: boolean,
  showSatisfiedDep: boolean,
  verbose: boolean
) => {
  const message = byDepender
    ? `${dep.depender.name}@${dep.depender.version} requires ${dep.name} ${dep.version}`
    : `${dep.name} ${dep.version} is required by ${dep.depender.name}@${dep.depender.version}`;

  if (dep.semverSatisfies) {
    if (showSatisfiedDep) {
      log(`  ✅  ${message} (${dep.installedVersion} is installed)`);
    }
  } else if (dep.isYalc) {
    log(`  ☑️  ${message} (${dep.installedVersion} is installed via yalc)`);
  } else if (dep.isIgnored) {
    if (verbose) {
      log(`  ☑️   ${message} IGNORED (${dep.name} is not installed)`);
    }
  } else if (dep.installedVersion) {
    if (dep.isPeerOptionalDependency) {
      log(`  ❌  ${message}) OPTIONAL (${dep.installedVersion} is installed)`);
    } else {
      log(`  ❌  ${message}) (${dep.installedVersion} is installed)`);
    }
  } else if (dep.isPeerOptionalDependency) {
    if (verbose) {
      log(`  ☑️   ${message} OPTIONAL (${dep.name} is not installed)`);
    }
  } else {
    log(`  ❌  ${message} (${dep.name} is not installed)`);
  }
};

function findSolutions(problems: Dependency[], allNestedPeerDependencies: Dependency[]) {
  log();
  log(`Searching for solutions for ${problems.length} missing dependencies...`);
  log();
  const resolutions: Resolution[] = findPossibleResolutions(problems, allNestedPeerDependencies);
  const resolutionsWithSolutions = resolutions.filter((r) => r.resolution);
  const nosolution = resolutions.filter((r) => !r.resolution);

  nosolution.forEach((solution) => {
    const name = solution.problem.name;
    const errorPrefix = `Unable to find a version of ${name} that satisfies the following peerDependencies:`;
    const peerDepRanges = allNestedPeerDependencies
      .filter((dep) => dep.name === name)
      .reduce((acc, dep) => (acc.includes(dep.version) ? acc : acc.concat(dep.version)), []);
    logError(`  ❌  ${errorPrefix} ${peerDepRanges.join(' and ')}`);
  });

  if (nosolution.length > 0) {
    logError();
  }

  return { resolutionsWithSolutions, nosolution };
}

function installPeerDependencies(
  commands: InstallCommand[],
  options: CliOptions,
  nosolution: Resolution[],
  packageManager: string
) {
  log('Installing peerDependencies...');
  log();
  commands.forEach((command) => {
    log(`$ ${formatCommand(command)}`);
    runInstallCommand(command);
    log();
  });

  const newProblems = getAllNestedPeerDependencies(options)
    .filter((dep) => isProblem(dep))
    .filter((dep) => !nosolution.some((x) => isSameDep(x.problem, dep)));

  if (nosolution.length === 0 && newProblems.length === 0) {
    log('All peer dependencies are met');
  }

  if (newProblems.length > 0) {
    log(`Found ${newProblems.length} new unmet peerDependencies...`);
    if (++recursiveCount < 5) {
      return checkPeerDependencies(packageManager, options);
    } else {
      logError('Recursion limit reached (5)');
      process.exit(5);
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

  allNestedPeerDependencies.forEach((dep) => {
    const relatedPeerDeps = allNestedPeerDependencies.filter((other) => other.name === dep.name && other !== dep);
    const showIfSatisfied = options.verbose || relatedPeerDeps.some((dep) => isProblem(dep));
    reportPeerDependencyStatus(dep, options.orderBy === 'depender', showIfSatisfied, options.verbose);
  });
}

export function checkPeerDependencies(packageManager: string, options: CliOptions) {
  const allNestedPeerDependencies = getAllNestedPeerDependencies(options);
  report(options, allNestedPeerDependencies);

  const problems = allNestedPeerDependencies.filter((dep) => isProblem(dep));

  if (!problems.length) {
    log('  ✅  All peer dependencies are met');
    return;
  }

  if (options.install) {
    const { nosolution, resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commands = getInstallCommands(packageManager, resolutionsWithSolutions);

    if (commands.length) {
      return installPeerDependencies(commands, options, nosolution, packageManager);
    }
  } else if (options.findSolutions) {
    const { resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commands = getInstallCommands(packageManager, resolutionsWithSolutions);

    if (commands.length) {
      log();
      log(`Install peerDependencies using ${commands.length > 1 ? 'these commands:' : 'this command'}:`);
      log();
      commands.forEach((command) => log(formatCommand(command)));
      log();
    }
  } else {
    log();
    log(`Search for solutions using this command:`);
    log();
    log(`npx check-peer-dependencies --findSolutions`);
    log();
    log(`Install peerDependencies using this command:`);
    log();
    log(`npx check-peer-dependencies --install`);
    log();
  }

  process.exit(1);
}
