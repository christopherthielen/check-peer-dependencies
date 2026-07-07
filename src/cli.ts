#!/usr/bin/env node

import yargs from 'yargs';
import { checkPeerDependencies } from './checkPeerDependencies';
import { getPackageManager } from './packageManager';

export interface CliOptions {
  help: boolean;
  yarn: boolean;
  verbose: boolean;
  debug: boolean;
  npm: boolean;
  ignore: string[];
  ignoreOptional: boolean;
  runOnlyOnRootDependencies: boolean;
  orderBy: 'depender' | 'dependee';
  findSolutions: boolean;
  install: boolean;
}

const options = yargs(process.argv.slice(2))
  .pkgConf('checkPeerDependencies')
  .usage('Options may also be stored in package.json under the "checkPeerDependencies" key')
  .option('help', {
    alias: 'h',
    type: 'boolean',
    description: 'Print usage information',
  })
  .option('yarn', {
    type: 'boolean',
    description: 'Force yarn package manager',
  })
  .option('npm', {
    type: 'boolean',
    description: 'Force npm package manager',
  })
  .option('orderBy', {
    choices: ['depender', 'dependee'] as const,
    default: 'dependee' as const,
    description: 'Order the output by depender or dependee',
  })
  .option('debug', {
    type: 'boolean',
    default: false,
    description: 'Print debugging information',
  })
  .option('verbose', {
    type: 'boolean',
    default: false,
    description: 'Prints every peer dependency, even those that are met',
  })
  .option('ignore', {
    type: 'string',
    array: true,
    default: [],
    description: 'package name to ignore (may specify multiple)',
  })
  .option('ignoreOptional', {
    type: 'boolean',
    default: false,
    description: 'Ignore optional peer dependencies',
  })
  .option('runOnlyOnRootDependencies', {
    type: 'boolean',
    default: false,
    description: 'Run tool only on package root dependencies',
  })
  .option('findSolutions', {
    type: 'boolean',
    default: false,
    description: 'Search for solutions and print package installation commands',
  })
  .option('install', {
    type: 'boolean',
    default: false,
    description: 'Install missing or incorrect peerDependencies',
  })
  .check((argv) => {
    if (argv.yarn && argv.npm) {
      throw new Error('Specify either --yarn or --npm but not both');
    }
    return true;
  }).argv as CliOptions;

if (options.help) {
  process.exit(0);
}

const packageManager = getPackageManager(options.yarn, options.npm);
checkPeerDependencies(packageManager, options);
