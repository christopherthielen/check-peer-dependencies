#!/usr/bin/env node

import * as yarrrrgs from 'yargs';
import { checkPeerDependencies } from './checkPeerDependencies';
import { getPackageManager } from './packageManager';
import { getConfig } from './readJson';
import { getCurrentBranch } from './gitUtils';
import { getPeerDepCheckFF } from './featureFlag';

const options = yarrrrgs
    .pkgConf('checkPeerDependencies')
    .usage('Options may also be stored in package.json under the "checkPeerDependencies" key')
    .option('help', {
      alias: 'h',
      boolean: true,
      description: `Print usage information`,
    })
    .option('yarn', {
      boolean: true,
      description: `Force yarn package manager`,
    })
    .option('npm', {
      boolean: true,
      description: `Force npm package manager`,
    })
    .option('orderBy', {
      choices: ['depender', 'dependee'],
      default: 'dependee',
      description: 'Order the output by depender or dependee',
    })
    .option('debug', {
      boolean: true,
      default: false,
      description: 'Print debugging information',
    })
    .option('verbose', {
      boolean: true,
      default: false,
      description: 'Prints every peer dependency, even those that are met',
    })
    .option('ignore', {
      string:  true,
      array: true,
      default: [],
      description: 'package name to ignore (may specify multiple)',
    })
    .option('config', {
      string:  true,
      default: '',
      description: 'path to the config file (relative to the project root)',
    })
    .option('runOnlyOnRootDependencies', {
        boolean: true,
        default: false,
        description: 'Run tool only on package root dependencies',
    })
    .option('findSolutions', {
      boolean: true,
      default: false,
      description: 'Search for solutions and print package installation commands',
    })
    .option('install', {
      boolean: true,
      default: false,
      description: 'Install missing or incorrect peerDependencies',
    })
    .check(argv => {
      if (argv.yarn && argv.npm) {
        throw new Error('Specify either --yarn or --npm but not both');
      }
      return true;
    }).argv as CliOptions;

export interface CliOptions {
  help: boolean;
  yarn: boolean;
  verbose: boolean;
  debug: boolean;
  npm: boolean;
  ignore: string[];
  runOnlyOnRootDependencies: boolean;
  orderBy: 'depender' | 'dependee';
  findSolutions: boolean;
  install: boolean;
  config: string;
}

if (options.help) {
  process.exit(-2);
}

async function isOnIgnoredBranch(ignoredBranchPrefixes: string[]) {
  const currentBranch = await getCurrentBranch();
  return ignoredBranchPrefixes.some(prefix => currentBranch.startsWith(prefix));
}

async function isFeatureFlagOff(launchdarklyClientId: string) {
  const isPeerDepCheckOn = await getPeerDepCheckFF(launchdarklyClientId);
  return !isPeerDepCheckOn;
}

async function main() {
  const { ignoredBranchPrefixes, launchdarklyClientId } = getConfig(options.config);

  if (await isOnIgnoredBranch(ignoredBranchPrefixes)) {
    console.log('Skip peer dependency check since we are on the ignored branch.')
    process.exit(0);
  }

  if (await isFeatureFlagOff(launchdarklyClientId)) {
    console.log('Skip peer dependency check since the feature flag is off.')
    process.exit(0);
  }

  const packageManager = getPackageManager(options.yarn, options.npm);
  checkPeerDependencies(packageManager, options);

  process.exit(0);
}

main();
