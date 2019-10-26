import * as fs from 'fs';
import * as path from "path";
import * as resolve from 'resolve';
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
}

interface PackageDependencies {
  packageName: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  peerDependencies: Dependency[];
}

type DependencyWalkVisitor = (packagePath: string, packageJson: PackageJson, packageDependencies: PackageDependencies) => void;

export function gatherPeerDependencies(packagePath): Dependency[] {
  let peerDeps = [];

  walkPackageDependencyTree(packagePath, (path, json, deps) => {
    peerDeps = peerDeps.concat(deps.peerDependencies)
  }, []);

  // Eliminate duplicates
  return peerDeps.reduce((acc: Dependency[], dep: Dependency) => {
    return acc.some(dep2 => dep.name === dep2.name && dep.version === dep2.version) ? acc : acc.concat(dep);
  }, [] as Dependency[])
}

export function walkPackageDependencyTree(packagePath: string, visitor: DependencyWalkVisitor, visitedPaths: string[]) {
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

  visitor(packagePath, packageJson, packageDependencies);

  function walkDependency(dependency) {
    if (resolve.isCore(dependency.name)) {
      return;
    }

    const dependencyPath = resolvePackageDir(packagePath, dependency.name);
    if (!dependencyPath) {
      throw new Error(`Unable to resolve package ${dependency.name} from ${packagePath}`)
    }
    walkPackageDependencyTree(dependencyPath, visitor, visitedPaths);
  }

  packageDependencies.dependencies.forEach(walkDependency);
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
  const { name, dependencies = {}, devDependencies = {}, peerDependencies = {} } = packageJson;

  return {
    packageName: name,
    dependencies: buildDependencyArray(packagePath, packageJson, dependencies),
    devDependencies: buildDependencyArray(packagePath, packageJson, devDependencies),
    peerDependencies: buildDependencyArray(packagePath, packageJson, peerDependencies),
  };
}

export function resolvePackageDir(basedir: string, packageName: string) {
  let packagePath;

  function packageFilter(pkg, pkgfile) {
    packagePath = pkgfile;
    return pkg;
  }

  try {
    resolve.sync(packageName, { basedir, packageFilter });
  } catch (ignored) {
    // resolve.sync throws if no main: is present
    // Some packages (such as @types/*) do not have a main
    // As long as we have a packagePath, it's fine
  }

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
