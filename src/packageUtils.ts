import * as fs from 'fs';
import * as path from "path";
import * as resolve from 'resolve';
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

  // What is a peerDevDependency? This is not a standard.
  // This is an array of package names found in `peerDependencies` which should be installed as devDependencies.
  // This addresses a specific use case: to provide downstream projects with package building opinions such as
  // a specific version of react and rollup and typescript.
  // Example:
  // peerDevDependencies: ["rollup", "typescript"]
  peerDevDependencies: string[];
}

export interface Dependency {
  name: string;
  version: string;
  depender: string;
  dependerPath: string;
  dependerVersion: string;
  installedVersion?: string | undefined;
  semverSatisfies?: boolean;
  isYalc?: boolean;
  isPeerDevDependency?: boolean;
}

interface PackageDependencies {
  packageName: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  peerDependencies: Dependency[];
  peerDevDependencies: string[];
}

type DependencyWalkVisitor = (packagePath: string, packageJson: PackageJson, packageDependencies: PackageDependencies) => void;

export function gatherPeerDependencies(packagePath, options: CliOptions): Dependency[] {
  let peerDeps: Dependency[] = [];
  const visitor: DependencyWalkVisitor = (path, json, deps) => {
    peerDeps = peerDeps.concat(deps.peerDependencies);
  };
  walkPackageDependencyTree(packagePath, visitor, [], options);

  // Eliminate duplicates
  return peerDeps.reduce((acc: Dependency[], dep: Dependency) => {
    return acc.some(dep2 => isSameDep(dep, dep2)) ? acc : acc.concat(dep);
  }, [] as Dependency[]);
}

export function walkPackageDependencyTree(packagePath: string, visitor: DependencyWalkVisitor, visitedPaths: string[], options: CliOptions) {
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
  const packageDependencies = getPackageDependencies(packagePath, packageJson);

  if (options.debug) {
    console.log(packageJsonPath);
    packageDependencies.peerDependencies.forEach(dep => console.log(dep))
  }
  visitor(packagePath, packageJson, packageDependencies);

  function walkDependency(dependency) {
    if (resolve.isCore(dependency.name)) {
      return;
    }

    const dependencyPath = resolvePackageDir(packagePath, dependency.name);
    if (dependencyPath) {
      walkPackageDependencyTree(dependencyPath, visitor, visitedPaths, options);
    } else {
      console.log(`WARN: Unable to resolve package ${dependency.name} from ${packagePath}`)
    }
  }
  
 if (isRootPackage) packageDependencies.devDependencies.forEach(walkDependency);
 if ((isRootPackage) || (!options.runOnlyOnRootDependencies)) packageDependencies.dependencies.forEach(walkDependency)
}

function buildDependencyArray(packagePath: string, packageJson: PackageJson, dependenciesObject: any): Dependency[] {
  return Object.keys(dependenciesObject).map(name => ({
    name: name,
    version: dependenciesObject[name],
    depender: packageJson.name,
    dependerVersion: packageJson.version,
    dependerPath: packagePath,
  }));
}

export function getPackageDependencies(packagePath: string, packageJson: PackageJson): PackageDependencies {
  const { name, dependencies = {}, devDependencies = {}, peerDependencies = {}, peerDevDependencies = [] } = packageJson;

  const applyPeerDevDependencies= (dep: Dependency): Dependency =>
      ({ ...dep, isPeerDevDependency: peerDevDependencies.includes && peerDevDependencies.includes(dep.name) });

  return {
    packageName: name,
    dependencies: buildDependencyArray(packagePath, packageJson, dependencies),
    devDependencies: buildDependencyArray(packagePath, packageJson, devDependencies),
    peerDependencies: buildDependencyArray(packagePath, packageJson, peerDependencies).map(applyPeerDevDependencies),
    peerDevDependencies,
  };
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
  const keys: Array<keyof Dependency> = [
    "name",
    "version",
    "depender",
    "dependerPath",
    "dependerVersion",
    "installedVersion",
    "semverSatisfies",
    "isYalc",
    "isPeerDevDependency",
  ];

  return keys.every(key => a[key] === b[key]);
}
