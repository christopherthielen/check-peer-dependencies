#!/usr/bin/env node

import * as yarrrrgs from 'yargs';
import { checkPeerDependencies } from './checkPeerDependencies';
import { getPackageManager } from './packageManager';

const options = yarrrrgs
  .pkgConf('checkPeerDependencies')
  .usage(
    'Options may also be stored in package.json under the "checkPeerDependencies" key'
  )
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
    string: true,
    array: true,
    default: [],
    description: 'package name to ignore (may specify multiple)',
  })
  .option('scopes', {
    string: true,
    array: true,
    default: [],
    description:
      'package scopes to limit the results to (may specify multiple)',
  })
  .option('transitivePaths', {
    string: true,
    array: true,
    default: [],
    description:
      'monorepo package paths to treat as having peer dependency requirements that may not be met, i.e. they do not need to install the peer dependencies since they are not the final consumer',
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
  .check((argv) => {
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
  transitivePaths: string[];
  scopes: string[];
  runOnlyOnRootDependencies: boolean;
  orderBy: 'depender' | 'dependee';
  findSolutions: boolean;
  install: boolean;
}

if (options.help) {
  process.exit(-2);
}

const packageManager = getPackageManager(options.yarn, options.npm);
checkPeerDependencies(packageManager, options);
