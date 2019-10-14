#!/usr/bin/env node

import * as yarrrrgs from 'yargs';
import { checkPeerDependencies } from './checkPeerDependencies';
import { getPackageManager } from './packageManager';

const options: CliOptions = yarrrrgs
    .option('help', {
      alias: 'h',
      boolean: true,
      description: `Print usage information`,
    })
    .option('yarn', {
      boolean: true,
      description: `Use yarn package manager`,
    })
    .option('npm', {
      boolean: true,
      description: `Use npm package manager`,
    })
    .option('install', {
      boolean: true,
      description: 'Install missing or incorrect peerDependencies'
    })
    .check(argv => {
      if (argv.yarn && argv.npm) {
        throw new Error('Specify either --yarn or --npm but not both');
      }
      return true;
    }).argv;

export interface CliOptions {
    help: boolean;
    yarn: boolean;
    npm: boolean;
    install: boolean;
}

if (options.help) {
  process.exit(-2);
}

const packageManager = getPackageManager(options);
checkPeerDependencies(packageManager, options.install);
