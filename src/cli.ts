import * as fs from 'fs';
import * as yarrrrgs from 'yargs';
import { checkPeerDependencies } from './check_peer_dependencies';

const yargs = yarrrrgs
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
    });

if (yargs.argv.help) {
  process.exit(-2);
}

checkPeerDependencies(yargs);
