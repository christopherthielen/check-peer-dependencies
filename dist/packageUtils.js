"use strict";
exports.__esModule = true;
exports.checkPrerelease = exports.modifiedSemverSatisfies = exports.isSameDep = exports.getInstalledVersion = exports.resolvePackageDir = exports.getPackageMeta = exports.walkPackageDependencyTree = exports.gatherPeerDependencies = void 0;
var fs = require("fs");
var path = require("path");
var resolve = require("resolve");
var semver = require("semver");
var readJson_1 = require("./readJson");
function gatherPeerDependencies(packagePath, options) {
    var peerDeps = [];
    var visitor = function (path, json, deps) {
        peerDeps = peerDeps.concat(deps.peerDependencies);
    };
    walkPackageDependencyTree(packagePath, false, visitor, [], options);
    var registries = getRegistries();
    // Eliminate duplicates and check if owned by mcp
    return peerDeps.reduce(function (acc, dep) {
        return (acc.some(function (dep2) { return isSameDep(dep, dep2); }) || (!options.includeAll ? !checkRegistry(dep, registries) : false)) ? acc : acc.concat(dep);
    }, []);
}
exports.gatherPeerDependencies = gatherPeerDependencies;
function walkPackageDependencyTree(packagePath, isAncestorDevDependency, visitor, visitedPaths, options) {
    var isRootPackage = visitedPaths.length === 0;
    if (visitedPaths.includes(packagePath)) {
        return;
    }
    visitedPaths.push(packagePath);
    var packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json missing at ".concat(packageJsonPath, "."));
    }
    var packageJson = (0, readJson_1.readJson)(packageJsonPath);
    var packageDependencies = getPackageMeta(packagePath, packageJson, isAncestorDevDependency);
    if (options.debug) {
        console.log(packageJsonPath);
        packageDependencies.peerDependencies.forEach(function (dep) { return console.log(dep); });
    }
    visitor(packagePath, packageJson, packageDependencies);
    function walkDependency(dependency, isAncestorDevDependency) {
        if (resolve.isCore(dependency.name)) {
            return;
        }
        var dependencyPath = resolvePackageDir(packagePath, dependency.name);
        if (!dependencyPath) {
            if (packageDependencies.optionalDependencies.some(function (x) { return x.name === dependency.name; })) {
                // don't fail if the missing dependency is in optionalDependencies
                if (options.debug) {
                    console.log("Ignoring missing optional dependency ".concat(dependency.name, " from ").concat(packagePath));
                }
                return;
            }
            else {
                throw new Error("WARN: Unable to resolve package ".concat(dependency.name, " from ").concat(packagePath));
            }
        }
        walkPackageDependencyTree(dependencyPath, isAncestorDevDependency, visitor, visitedPaths, options);
    }
    if (isRootPackage)
        packageDependencies.devDependencies.forEach(function (dep) { return walkDependency(dep, true); });
    if (isRootPackage || !options.runOnlyOnRootDependencies)
        packageDependencies.dependencies.forEach(function (dep) { return walkDependency(dep, false); });
}
exports.walkPackageDependencyTree = walkPackageDependencyTree;
function buildDependencyArray(type, pkgJson, depender, isAncestorDevDependency) {
    var dependenciesObject = pkgJson[type] || {};
    var peerDependenciesMeta = pkgJson.peerDependenciesMeta || {};
    // backwards compat
    var peerDevDependencies = pkgJson.peerDevDependencies || [];
    var packageNames = Object.keys(dependenciesObject);
    return packageNames.map(function (name) {
        var _a, _b;
        var isPeerOptionalDependency = !!((_a = peerDependenciesMeta[name]) === null || _a === void 0 ? void 0 : _a.optional);
        var isPeerDevDependency = isAncestorDevDependency || !!((_b = peerDependenciesMeta[name]) === null || _b === void 0 ? void 0 : _b.dev) || !!peerDevDependencies.includes(name);
        return {
            name: name,
            type: type,
            version: dependenciesObject[name],
            isPeerDevDependency: isPeerDevDependency,
            isPeerOptionalDependency: isPeerOptionalDependency,
            depender: depender
        };
    });
}
function getPackageMeta(packagePath, packageJson, isAncestorDevDependency) {
    var name = packageJson.name, version = packageJson.version;
    var packageMeta = { name: name, version: version, packagePath: packagePath };
    packageMeta.dependencies = buildDependencyArray("dependencies", packageJson, packageMeta, isAncestorDevDependency);
    packageMeta.devDependencies = buildDependencyArray("devDependencies", packageJson, packageMeta, isAncestorDevDependency);
    packageMeta.optionalDependencies = buildDependencyArray("optionalDependencies", packageJson, packageMeta, isAncestorDevDependency);
    packageMeta.peerDependencies = buildDependencyArray("peerDependencies", packageJson, packageMeta, isAncestorDevDependency);
    return packageMeta;
}
exports.getPackageMeta = getPackageMeta;
function resolvePackageDir(basedir, packageName) {
    var packagePath;
    // In resolve() v2.x this callback has a different signature
    // function packageFilter(pkg, pkgfile, pkgdir) {
    function packageFilter(pkg, pkgdir) {
        packagePath = pkgdir;
        return pkg;
    }
    try {
        resolve.sync(packageName, { basedir: basedir, packageFilter: packageFilter });
    }
    catch (ignored) {
        // resolve.sync throws if no main: is present
        // Some packages (such as @types/*) do not have a main
        // As long as we have a packagePath, it's fine
    }
    // noinspection JSUnusedAssignment
    return packagePath;
}
exports.resolvePackageDir = resolvePackageDir;
function getInstalledVersion(dep) {
    var peerDependencyDir = resolvePackageDir(".", dep.name);
    if (!peerDependencyDir) {
        return undefined;
    }
    var packageJson = (0, readJson_1.readJson)(path.resolve(peerDependencyDir, 'package.json'));
    var isYalc = fs.existsSync(path.resolve(peerDependencyDir, 'yalc.sig'));
    return isYalc ? "".concat(packageJson.version, "-yalc") : packageJson.version;
}
exports.getInstalledVersion = getInstalledVersion;
function isSameDep(a, b) {
    var keys = ["name", "version", "installedVersion", "semverSatisfies", "isYalc", "isPeerDevDependency",];
    return keys.every(function (key) { return a[key] === b[key]; }) &&
        a.depender.name === b.depender.name &&
        a.depender.version === b.depender.version &&
        a.depender.packagePath === b.depender.packagePath;
}
exports.isSameDep = isSameDep;
function modifiedSemverSatisfies(version, range) {
    if (semver.satisfies(version, range, { includePrerelease: true })) {
        return checkPrerelease(version, range);
    }
    return false;
}
exports.modifiedSemverSatisfies = modifiedSemverSatisfies;
function checkPrerelease(version, range) {
    var versionPrerelease = semver.prerelease(version);
    var rangePrerelease = semver.prerelease(semver.minVersion(range).version);
    if (versionPrerelease && rangePrerelease) {
        if (versionPrerelease.join() === rangePrerelease.join()) {
            return true;
        }
        return false;
    }
    return true;
}
exports.checkPrerelease = checkPrerelease;
function getRegistries() {
    try {
        var fullPath = path.join(__dirname, '../.include');
        var data = fs.readFileSync(fullPath, 'utf8');
        return data.split(/\r?\n/);
    }
    catch (err) {
        console.error(err);
    }
    return [];
}
function checkRegistry(dep, registries) {
    function checkPatten(depName, registryName) {
        var re = new RegExp('^' + registryName);
        return re.test(depName);
    }
    return registries.some(function (registryName) { return checkPatten(dep.name, registryName); });
}
