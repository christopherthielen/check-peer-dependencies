#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var yarrrrgs = require("yargs");
var checkPeerDependencies_1 = require("./checkPeerDependencies");
var packageManager_1 = require("./packageManager");
var options = yarrrrgs
    .pkgConf('checkPeerDependencies')
    .usage('Options may also be stored in package.json under the "checkPeerDependencies" key')
    .option('help', {
    alias: 'h',
    boolean: true,
    description: "Print usage information"
})
    .option('yarn', {
    boolean: true,
    description: "Force yarn package manager"
})
    .option('npm', {
    boolean: true,
    description: "Force npm package manager"
})
    .option('orderBy', {
    choices: ['depender', 'dependee'],
    "default": 'dependee',
    description: 'Order the output by depender or dependee'
})
    .option('debug', {
    boolean: true,
    "default": false,
    description: 'Print debugging information'
})
    .option('verbose', {
    boolean: true,
    "default": false,
    description: 'Prints every peer dependency, even those that are met'
})
    .option('fail', {
    boolean: true,
    "default": false,
    description: 'Exits the process if there are packages found to be installed'
})
    .option('includeAll', {
    boolean: true,
    "default": false,
    description: 'Check for all peer dependencies (even outside .include file)'
})
    .option('ignore', {
    string: true,
    array: true,
    "default": [],
    description: 'package name to ignore (may specify multiple)'
})
    .option('runOnlyOnRootDependencies', {
    boolean: true,
    "default": false,
    description: 'Run tool only on package root dependencies'
})
    .option('findSolutions', {
    boolean: true,
    "default": false,
    description: 'Search for solutions and print package installation commands'
})
    .option('install', {
    boolean: true,
    "default": false,
    description: 'Install missing or incorrect peerDependencies'
})
    .check(function (argv) {
    if (argv.yarn && argv.npm) {
        throw new Error('Specify either --yarn or --npm but not both');
    }
    return true;
}).argv;
if (options.help) {
    process.exit(-2);
}
var packageManager = (0, packageManager_1.getPackageManager)(options.yarn, options.npm);
(0, checkPeerDependencies_1.checkPeerDependencies)(packageManager, options);
