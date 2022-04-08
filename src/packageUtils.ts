import * as fs from 'fs';
import * as path from "path";
import * as resolve from 'resolve';
import * as semver from 'semver';
import { CliOptions } from './cli';
import { readJson } from './readJson';

interface PackageJson {
  name: string;
  version: string;
  dependencies: {
    [key: string]: string;
  };
  devDependencies: {
    [key: string]: string;
  };
  peerDependencies: {
    [key: string]: string;
  };
  // deprecated: use peerDependenciesMeta.foo.dev
  peerDevDependencies: string[];
  // See: https://github.com/yarnpkg/rfcs/blob/master/accepted/0000-optional-peer-dependencies.md
  peerDependenciesMeta: {
    [key: string]: {
      optional?: boolean;
      // non-standard
      dev?: boolean;
    };
  };
  optionalDependencies: {
    [key: string]: string;
  };
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

export interface Dependency {
  name: string;
  version: string;
  depender: PackageMeta;
  type: DependencyType
  isPeerOptionalDependency: boolean;
  isPeerDevDependency: boolean;
  installedVersion?: string | undefined;
  semverSatisfies?: boolean;
  isYalc?: boolean;
  isIgnored?: boolean;
}

interface PackageMeta {
  name: string;
  version: string;
  packagePath: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  optionalDependencies: Dependency[];
  peerDependencies: Dependency[];
}

type DependencyWalkVisitor = (packagePath: string, packageJson: PackageJson, packageMeta: PackageMeta) => void;

export function gatherPeerDependencies(packagePath, options: CliOptions): Dependency[] {
  let peerDeps: Dependency[] = [];
  const visitor: DependencyWalkVisitor = (path, json, deps) => {
    peerDeps = peerDeps.concat(deps.peerDependencies);
  };
  walkPackageDependencyTree(packagePath, false, visitor, [], options);

  // Eliminate duplicates
  return peerDeps.reduce((acc: Dependency[], dep: Dependency) => {
    return acc.some(dep2 => isSameDep(dep, dep2)) ? acc : acc.concat(dep);
  }, [] as Dependency[]);
}

export function walkPackageDependencyTree(packagePath: string, isAncestorDevDependency: boolean, visitor: DependencyWalkVisitor, visitedPaths: string[], options: CliOptions) {
  const isRootPackage = visitedPaths.length === 0;

  if (visitedPaths.includes(packagePath)) {
    return;
  }
  visitedPaths.push(packagePath);

  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json missing at ${packageJsonPath}.`);
  }

  const packageJson = readJson(packageJsonPath) as PackageJson;
  const packageDependencies = getPackageMeta(packagePath, packageJson, isAncestorDevDependency);

  if (options.debug) {
    console.log(packageJsonPath);
    packageDependencies.peerDependencies.forEach(dep => console.log(dep))
  }

  visitor(packagePath, packageJson, packageDependencies);

  function walkDependency(dependency: Dependency, isAncestorDevDependency: boolean) {
    if (resolve.isCore(dependency.name)) {
      return;
    }

    const dependencyPath = resolvePackageDir(packagePath, dependency.name);

    if (!dependencyPath) {
      if (packageDependencies.optionalDependencies.some(x => x.name === dependency.name)) {
        // don't fail if the missing dependency is in optionalDependencies
        if (options.debug) {
          console.log(`Ignoring missing optional dependency ${dependency.name} from ${packagePath}`);
        }
        return;
      } else {
        throw new Error(`WARN: Unable to resolve package ${dependency.name} from ${packagePath}`)
      }
    }

    walkPackageDependencyTree(dependencyPath, isAncestorDevDependency, visitor, visitedPaths, options);
  }

  if (isRootPackage) packageDependencies.devDependencies.forEach(dep => walkDependency(dep, true));
  if (isRootPackage || !options.runOnlyOnRootDependencies) packageDependencies.dependencies.forEach(dep => walkDependency (dep, false));
}

function buildDependencyArray(type: Dependency["type"], pkgJson: PackageJson, depender: PackageMeta, isAncestorDevDependency: boolean): Dependency[] {
  const dependenciesObject = pkgJson[type] || {};
  const peerDependenciesMeta = pkgJson.peerDependenciesMeta || {};
  // backwards compat
  const peerDevDependencies = pkgJson.peerDevDependencies || [];

  const packageNames = Object.keys(dependenciesObject);

  return packageNames.map(name => {
    const isPeerOptionalDependency= !!peerDependenciesMeta[name]?.optional;
    const isPeerDevDependency = isAncestorDevDependency || !!peerDependenciesMeta[name]?.dev || !!peerDevDependencies.includes(name);

    return {
      name,
      type,
      version: dependenciesObject[name],
      isPeerDevDependency,
      isPeerOptionalDependency,
      depender,
    };
  });
}

export function getPackageMeta(packagePath: string, packageJson: PackageJson, isAncestorDevDependency: boolean): PackageMeta {
  const { name, version} = packageJson;
  const packageMeta = { name, version, packagePath } as PackageMeta;

  packageMeta.dependencies = buildDependencyArray("dependencies", packageJson, packageMeta, isAncestorDevDependency);
  packageMeta.devDependencies = buildDependencyArray("devDependencies", packageJson, packageMeta, isAncestorDevDependency);
  packageMeta.optionalDependencies = buildDependencyArray("optionalDependencies", packageJson, packageMeta, isAncestorDevDependency);
  packageMeta.peerDependencies = buildDependencyArray("peerDependencies", packageJson, packageMeta, isAncestorDevDependency);

  return packageMeta;
}

export function resolvePackageDir(basedir: string, packageName: string) {
  let packagePath;

  // In resolve() v2.x this callback has a different signature
  // function packageFilter(pkg, pkgfile, pkgdir) {
  function packageFilter(pkg, pkgdir) {
    packagePath = pkgdir;
    return pkg;
  }

  try {
    resolve.sync(packageName, { basedir, packageFilter });
  } catch (ignored) {
    // resolve.sync throws if no main: is present
    // Some packages (such as @types/*) do not have a main
    // As long as we have a packagePath, it's fine
  }

  // noinspection JSUnusedAssignment
  return packagePath;
}

export function getInstalledVersion(dep: Dependency): string | undefined {
  const peerDependencyDir = resolvePackageDir(".", dep.name);
  if (!peerDependencyDir) {
    return undefined;
  }
  const packageJson = readJson(path.resolve(peerDependencyDir, 'package.json'));
  const isYalc = fs.existsSync(path.resolve(peerDependencyDir, 'yalc.sig'));
  return isYalc ? `${packageJson.version}-yalc` : packageJson.version;
}

export function isSameDep(a: Dependency, b: Dependency) {
  const keys: Array<keyof Dependency> = [ "name", "version", "installedVersion", "semverSatisfies", "isYalc", "isPeerDevDependency", ];
  return keys.every(key => a[key] === b[key]) &&
      a.depender.name === b.depender.name &&
      a.depender.version === b.depender.version &&
      a.depender.packagePath === b.depender.packagePath;
}

export function modifiedSemverSatisfies(version: string, range: string) {
  if(semver.satisfies(version, range, { includePrerelease: true })) {
    return checkPrerelease(version, range)
  }
  return false
}

function checkPrerelease (version, range) {
  const versionPrerelease = semver.prerelease(version)
  const rangePrerelease = semver.prerelease(semver.minVersion(range).version)

  if(versionPrerelease && rangePrerelease) {
    if(versionPrerelease.join() == rangePrerelease.join()) {
      return true
    }
    return false
  }
  return true
}
