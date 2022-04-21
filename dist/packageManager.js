"use strict";
exports.__esModule = true;
exports.getCommandLines = exports.getPackageManager = void 0;
var fs = require("fs");
function getPackageManager(forceYarn, forceNpm) {
    if (forceYarn)
        return 'yarn';
    if (forceNpm)
        return 'npm';
    if (fs.existsSync('yarn.lock'))
        return 'yarn';
    if (fs.existsSync('package-lock.json'))
        return 'npm';
}
exports.getPackageManager = getPackageManager;
function getCommandLines(packageManager, resolutions) {
    var installs = resolutions.filter(function (r) { return r.resolution && r.resolutionType === 'install'; }).map(function (r) { return r.resolution; });
    var devInstalls = resolutions.filter(function (r) { return r.resolution && r.resolutionType === 'devInstall'; }).map(function (r) { return r.resolution; });
    var upgrades = resolutions.filter(function (r) { return r.resolution && r.resolutionType === 'upgrade'; }).map(function (r) { return r.resolution; });
    var commands = [];
    if (packageManager === 'yarn') {
        if (installs.length) {
            commands.push("yarn add ".concat(installs.join(' ')));
        }
        if (devInstalls.length) {
            commands.push("yarn add -D ".concat(devInstalls.join(' ')));
        }
        if (upgrades.length) {
            commands.push("yarn upgrade ".concat(upgrades.join(' ')));
        }
    }
    else if (packageManager === 'npm' && (installs.length || upgrades.length || devInstalls.length)) {
        // if (installs.length || upgrades.length) {
        //   commands.push(`npm install ${installs.concat(upgrades).join(' ')}`);
        // }
        // if (devInstalls.length) {
        //   commands.push(`npm install -D ${devInstalls}`);
        // }
        commands.push(installs.concat(upgrades, devInstalls).join(' '));
    }
    return commands;
}
exports.getCommandLines = getCommandLines;
