#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.checkPeerDependencies = void 0;
var shelljs_1 = require("shelljs");
var packageManager_1 = require("./packageManager");
var packageUtils_1 = require("./packageUtils");
var solution_1 = require("./solution");
function getAllNestedPeerDependencies(options) {
    var gatheredDependencies = (0, packageUtils_1.gatherPeerDependencies)(".", options);
    function applySemverInformation(dep) {
        var installedVersion = (0, packageUtils_1.getInstalledVersion)(dep);
        var semverSatisfies = installedVersion ? (0, packageUtils_1.modifiedSemverSatisfies)(installedVersion, dep.version) : false;
        var isYalc = !!/-[a-f0-9]+-yalc$/.exec(installedVersion);
        return __assign(__assign({}, dep), { installedVersion: installedVersion, semverSatisfies: semverSatisfies, isYalc: isYalc });
    }
    function applyIgnoreInformation(dep) {
        var isIgnored = options.ignore.includes(dep.name);
        return __assign(__assign({}, dep), { isIgnored: isIgnored });
    }
    return gatheredDependencies.map(applySemverInformation).map(applyIgnoreInformation);
}
var recursiveCount = 0;
var isProblem = function (dep) { return !dep.semverSatisfies && !dep.isIgnored && !dep.isYalc && !dep.isPeerOptionalDependency; };
var reportPeerDependencyStatus = function (dep, byDepender, showSatisfiedDep, verbose) {
    var message = byDepender ?
        "".concat(dep.depender.name, "@").concat(dep.depender.version, " requires ").concat(dep.name, " ").concat(dep.version) :
        "".concat(dep.name, " ").concat(dep.version, " is required by ").concat(dep.depender.name, "@").concat(dep.depender.version);
    if (dep.semverSatisfies) {
        if (showSatisfiedDep) {
            // console.log(`  ✅  ${message} (${dep.installedVersion} is installed)`);
            // Do nothing
        }
    }
    else if (dep.isYalc) {
        // console.log(`  ☑️  ${message} (${dep.installedVersion} is installed via yalc)`);
        // Do Nothing
    }
    else if (dep.installedVersion && dep.isPeerOptionalDependency) {
        if (verbose) {
            console.log("  \u2611\uFE0F   ".concat(message, ") OPTIONAL (").concat(dep.installedVersion, " is installed)"));
        }
    }
    else if (dep.isIgnored) {
        if (verbose) {
            console.log("  \u2611\uFE0F   ".concat(message, " IGNORED (").concat(dep.name, " is not installed)"));
        }
    }
    else if (dep.installedVersion) {
        console.log("  \u274C  ".concat(message, " (").concat(dep.installedVersion, " is installed)"));
    }
    else if (dep.isPeerOptionalDependency) {
        if (verbose) {
            console.log("  \u2611\uFE0F   ".concat(message, " OPTIONAL (").concat(dep.name, " is not installed)"));
        }
    }
    else {
        console.log("  \u274C  ".concat(message, " (").concat(dep.name, " is not installed)"));
    }
};
function findSolutions(problems, allNestedPeerDependencies) {
    console.log();
    console.log("Searching for solutions for ".concat(problems.length, " missing dependencies..."));
    console.log();
    var resolutions = (0, solution_1.findPossibleResolutions)(problems, allNestedPeerDependencies);
    var resolutionsWithSolutions = resolutions.filter(function (r) { return r.resolution; });
    var nosolution = resolutions.filter(function (r) { return !r.resolution; });
    nosolution.forEach(function (solution) {
        var name = solution.problem.name;
        var errorPrefix = "Unable to find a version of ".concat(name, " that satisfies the following peerDependencies:");
        var peerDepRanges = allNestedPeerDependencies.filter(function (dep) { return dep.name === name; })
            .reduce(function (acc, dep) { return acc.includes(dep.version) ? acc : acc.concat(dep.version); }, []);
        console.error("  \u2B55  ".concat(errorPrefix, " ").concat(peerDepRanges.join(" and ")));
    });
    if (nosolution.length > 0) {
        console.error();
    }
    return { resolutionsWithSolutions: resolutionsWithSolutions, nosolution: nosolution };
}
function installPeerDependencies(commandLines, options, nosolution, packageManager) {
    console.log('Installing peerDependencies...');
    console.log();
    commandLines.forEach(function (command) {
        console.log("$ ".concat(command));
        (0, shelljs_1.exec)(command);
        console.log();
    });
    var newProblems = getAllNestedPeerDependencies(options)
        .filter(function (dep) { return isProblem(dep); })
        .filter(function (dep) { return !nosolution.some(function (x) { return (0, packageUtils_1.isSameDep)(x.problem, dep); }); });
    if (nosolution.length === 0 && newProblems.length === 0) {
        console.log('All peer dependencies are met');
    }
    if (newProblems.length > 0) {
        console.log("Found ".concat(newProblems.length, " new unmet peerDependencies..."));
        if (++recursiveCount < 5) {
            return checkPeerDependencies(packageManager, options);
        }
        else {
            console.error('Recursion limit reached (5)');
            process.exit(5);
        }
    }
    return;
}
function report(options, allNestedPeerDependencies) {
    if (options.orderBy === 'depender') {
        allNestedPeerDependencies.sort(function (a, b) { return "".concat(a.depender).concat(a.name).localeCompare("".concat(b.depender).concat(b.name)); });
    }
    else if (options.orderBy == 'dependee') {
        allNestedPeerDependencies.sort(function (a, b) { return "".concat(a.name).concat(a.depender).localeCompare("".concat(b.name).concat(b.depender)); });
    }
    allNestedPeerDependencies.forEach(function (dep) {
        var relatedPeerDeps = allNestedPeerDependencies.filter(function (other) { return other.name === dep.name && other !== dep; });
        var showIfSatisfied = options.verbose || relatedPeerDeps.some(function (dep) { return isProblem(dep); });
        reportPeerDependencyStatus(dep, options.orderBy === 'depender', showIfSatisfied, options.verbose);
    });
}
function checkPeerDependencies(packageManager, options) {
    var allNestedPeerDependencies = getAllNestedPeerDependencies(options);
    report(options, allNestedPeerDependencies);
    var problems = allNestedPeerDependencies.filter(function (dep) { return isProblem(dep); });
    if (!problems.length) {
        console.log('  ✅  All peer dependencies are met');
        return;
    }
    if (options.install) {
        var _a = findSolutions(problems, allNestedPeerDependencies), nosolution = _a.nosolution, resolutionsWithSolutions = _a.resolutionsWithSolutions;
        var commandLines = (0, packageManager_1.getCommandLines)(packageManager, resolutionsWithSolutions);
        if (commandLines.length) {
            return installPeerDependencies(commandLines, options, nosolution, packageManager);
        }
    }
    else if (options.findSolutions) {
        var resolutionsWithSolutions = findSolutions(problems, allNestedPeerDependencies).resolutionsWithSolutions;
        var commandLines = (0, packageManager_1.getCommandLines)(packageManager, resolutionsWithSolutions);
        if (commandLines.length) {
            console.log();
            console.log("Install peerDependencies using ".concat(commandLines.length > 1 ? 'these commands:' : 'this command', ":"));
            console.log();
            commandLines.forEach(function (command) { return console.log(command); });
            console.log();
        }
    }
    else {
        console.log();
        console.log("Search for solutions using this command:");
        console.log();
        console.log("npx check-peer-dependencies --findSolutions");
        console.log();
        console.log("Install peerDependencies using this command:");
        console.log();
        console.log("npx check-peer-dependencies --install");
        console.log();
    }
    process.exit(1);
}
exports.checkPeerDependencies = checkPeerDependencies;
