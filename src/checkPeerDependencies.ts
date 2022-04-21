#!/usr/bin/env node
import * as semver from 'semver';

import { exec } from 'shelljs';
import { CliOptions } from './cli';
import { getCommandLines } from './packageManager';
import { Dependency, gatherPeerDependencies, getInstalledVersion, isSameDep, modifiedSemverSatisfies, checkPrerelease } from './packageUtils';
import { findPossibleResolutions, Resolution } from './solution';

function getAllNestedPeerDependencies(options: CliOptions): Dependency[] {
  const gatheredDependencies = gatherPeerDependencies(".", options);

  function applySemverInformation(dep: Dependency): Dependency {
    const installedVersion = getInstalledVersion(dep);
    const semverSatisfies = installedVersion ? modifiedSemverSatisfies(installedVersion, dep.version) : false;
    const isYalc = !!/-[a-f0-9]+-yalc$/.exec(installedVersion);
    const unmatchedPrerelease = checkPrerelease(installedVersion, dep.version)

    return { ...dep, installedVersion, semverSatisfies, isYalc, unmatchedPrerelease };
  }

  function applyIgnoreInformation (dep: Dependency): Dependency {
    const isIgnored = options.ignore.includes(dep.name)
    return {...dep, isIgnored}
  }

  return gatheredDependencies.map(applySemverInformation).map(applyIgnoreInformation);
}

let recursiveCount = 0;

const  isProblem = (dep: Dependency) => !dep.semverSatisfies && !dep.isIgnored && !dep.isYalc && !dep.isPeerOptionalDependency;

const reportPeerDependencyStatus = (dep: Dependency, byDepender: boolean, showSatisfiedDep: boolean, verbose: boolean) => {
  const message = byDepender ?
      `${dep.depender.name}@${dep.depender.version} requires ${dep.name} ${dep.version}` :
      `${dep.name} ${dep.version} is required by ${dep.depender.name}@${dep.depender.version}`;

  let errorMessage = ''
  if (dep.semverSatisfies) {
    if (showSatisfiedDep) {
      // console.log(`  ✅  ${message} (${dep.installedVersion} is installed)`);
      // Do nothing
    }
  } else if (dep.isYalc) {
    // console.log(`  ☑️  ${message} (${dep.installedVersion} is installed via yalc)`);
    // Do Nothing
  } else if (dep.installedVersion && dep.isPeerOptionalDependency) {
    if (verbose) {
      errorMessage = `  ☑️   ${message}) OPTIONAL (${dep.installedVersion} is installed)`;
    }
  } else if (dep.installedVersion && !dep.unmatchedPrerelease) {
    errorMessage = `  ⚠   ${message}) (${dep.installedVersion} is installed | prerelease unmatched)`;
  } else if (dep.isIgnored) {
    if (verbose) {
      errorMessage = `  ☑️   ${message} IGNORED (${dep.name} is not installed)`;
    }
  } else if (dep.installedVersion) {
    errorMessage = `  ❌  ${message} (${dep.installedVersion} is installed)`;
  } else if (dep.isPeerOptionalDependency) {
    if (verbose) {
      errorMessage = `  ☑️   ${message} OPTIONAL (${dep.name} is not installed)`;
    }
  } else {
    errorMessage = `  ❌  ${message} (${dep.name} is not installed)`;
  }
  return errorMessage
};

function findSolutions(problems: Dependency[], allNestedPeerDependencies: Dependency[]) {
  console.log();
  console.log('Searching for solutions for missing dependencies...');
  console.log();
  const resolutions: Resolution[] = findPossibleResolutions(problems, allNestedPeerDependencies);
  const resolutionsWithSolutions = resolutions.filter(r => r.resolution);
  const nosolution = resolutions.filter(r => !r.resolution);

  nosolution.forEach(solution => {
    const name = solution.problem.name;
    const errorPrefix = `Unable to find a version of ${name} that satisfies the following peerDependencies:`;
    const peerDepRanges = allNestedPeerDependencies.filter(dep => dep.name === name)
        .reduce((acc, dep) => acc.includes(dep.version) ? acc : acc.concat(dep.version), []);
    console.log(`  ⭕  ${errorPrefix} ${peerDepRanges.join(" and ")}`)
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

  const newProblems = getAllNestedPeerDependencies(options)
      .filter(dep => isProblem(dep))
      .filter(dep => !nosolution.some(x => isSameDep(x.problem, dep)));

  if (nosolution.length === 0 && newProblems.length === 0) {
    console.log('All peer dependencies are met');
  }

  if (newProblems.length > 0) {
    console.log(`Found ${newProblems.length} new unmet peerDependencies...`);
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
  let messages = []

  allNestedPeerDependencies.forEach(dep => {
    const relatedPeerDeps = allNestedPeerDependencies.filter(other => other.name === dep.name && other !== dep);
    const showIfSatisfied = options.verbose || relatedPeerDeps.some(dep => isProblem(dep));
    const errorMessage = reportPeerDependencyStatus(dep, options.orderBy === 'depender', showIfSatisfied, options.verbose)
    if (errorMessage !== '' && !(messages.includes(errorMessage))) {
      messages.push(errorMessage)
    }
  });
  messages.forEach(message => {
    console.log(message)
  })
}

export function checkPeerDependencies(packageManager: string, options: CliOptions) {
  const allNestedPeerDependencies = getAllNestedPeerDependencies(options);
  report(options, allNestedPeerDependencies);

  const problems = allNestedPeerDependencies.filter(dep => isProblem(dep));

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
  } else if (options.fail) {
    const { nosolution, resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      console.log();
      console.log('Please install the following dependencies ');
      console.log();
      commandLines.forEach(command => console.log(command));
      console.log();
    }

    if (nosolution.length || commandLines.length) {
      process.exit(1)
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
    const { resolutionsWithSolutions } = findSolutions(problems, allNestedPeerDependencies);
    const commandLines = getCommandLines(packageManager, resolutionsWithSolutions);

    if (commandLines.length) {
      console.log();
      console.log('Please install the following dependencies ');
      console.log();
      commandLines.forEach(command => console.log(command));
      console.log();
    }
  }

  process.exit(0);
}
