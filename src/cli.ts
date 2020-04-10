#!/usr/bin/env node

import * as yarrrrgs from 'yargs';
import { checkPeerDependencies } from './checkPeerDependencies';
import { getPackageManager } from './packageManager';

const options = yarrrrgs
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
      default: 'depender',
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
  orderBy: 'depender' | 'dependee';
  install: boolean;
}

if (options.help) {
  process.exit(-2);
}

const packageManager = getPackageManager(options.yarn, options.npm);
checkPeerDependencies(packageManager, options);
