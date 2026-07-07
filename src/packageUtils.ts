import * as fs from 'fs';
import * as path from 'path';
import * as resolve from 'resolve';
import { CliOptions } from './cli';
import { readJson } from './readJson';

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  // deprecated: use peerDependenciesMeta.foo.dev
  peerDevDependencies?: string[];
  // See: https://github.com/yarnpkg/rfcs/blob/master/accepted/0000-optional-peer-dependencies.md
  peerDependenciesMeta?: Record<
    string,
    {
      optional?: boolean;
      // non-standard
      dev?: boolean;
    }
  >;
  optionalDependencies?: Record<string, string>;
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

export interface Dependency {
  name: string;
  version: string;
  depender: PackageMeta;
  type: DependencyType;
  isPeerOptionalDependency: boolean;
  isPeerDevDependency: boolean;
  installedVersion?: string;
  semverSatisfies?: boolean;
  isYalc?: boolean;
  isIgnored?: boolean;
}

export interface PackageMeta {
  name: string;
  version: string;
  packagePath: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  optionalDependencies: Dependency[];
  peerDependencies: Dependency[];
}

type DependencyWalkVisitor = (packagePath: string, packageJson: PackageJson, packageMeta: PackageMeta) => void;

export function gatherPeerDependencies(packagePath: string, options: CliOptions): Dependency[] {
  let peerDeps: Dependency[] = [];
  const visitor: DependencyWalkVisitor = (_path, _json, deps) => {
    peerDeps = peerDeps.concat(deps.peerDependencies);
  };
  walkPackageDependencyTree(packagePath, false, visitor, [], options);

  return peerDeps.reduce((acc: Dependency[], dep: Dependency) => {
    return acc.some((dep2) => isSameDep(dep, dep2)) ? acc : acc.concat(dep);
  }, []);
}

export function walkPackageDependencyTree(
  packagePath: string,
  isAncestorDevDependency: boolean,
  visitor: DependencyWalkVisitor,
  visitedPaths: string[],
  options: CliOptions
): void {
  const isRootPackage = visitedPaths.length === 0;

  if (visitedPaths.includes(packagePath)) {
    return;
  }
  visitedPaths.push(packagePath);

  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json missing at ${packageJsonPath}.`);
  }

  const packageJson = readJson<PackageJson>(packageJsonPath);
  const packageDependencies = getPackageMeta(packagePath, packageJson, isAncestorDevDependency);

  if (options.debug) {
    console.log(packageJsonPath);
    packageDependencies.peerDependencies.forEach((dep) => console.log(dep));
  }

  visitor(packagePath, packageJson, packageDependencies);

  function walkDependency(dependency: Dependency, isDevAncestor: boolean): void {
    if (resolve.isCore(dependency.name)) {
      return;
    }

    const dependencyPath = resolvePackageDir(packagePath, dependency.name);

    if (!dependencyPath) {
      if (packageDependencies.optionalDependencies.some((x) => x.name === dependency.name)) {
        if (options.debug) {
          console.log(`Ignoring missing optional dependency ${dependency.name} from ${packagePath}`);
        }
        return;
      }
      throw new Error(`WARN: Unable to resolve package ${dependency.name} from ${packagePath}`);
    }

    walkPackageDependencyTree(dependencyPath, isDevAncestor, visitor, visitedPaths, options);
  }

  if (isRootPackage) {
    packageDependencies.devDependencies.forEach((dep) => walkDependency(dep, true));
  }
  if (isRootPackage || !options.runOnlyOnRootDependencies) {
    packageDependencies.dependencies.forEach((dep) => walkDependency(dep, false));
  }
}

function buildDependencyArray(
  type: DependencyType,
  pkgJson: PackageJson,
  depender: PackageMeta,
  isAncestorDevDependency: boolean
): Dependency[] {
  const dependenciesObject = pkgJson[type] ?? {};
  const peerDependenciesMeta = pkgJson.peerDependenciesMeta ?? {};
  const peerDevDependencies = pkgJson.peerDevDependencies ?? [];

  return Object.keys(dependenciesObject).map((name) => ({
    name,
    type,
    version: dependenciesObject[name],
    isPeerDevDependency:
      isAncestorDevDependency || !!peerDependenciesMeta[name]?.dev || peerDevDependencies.includes(name),
    isPeerOptionalDependency: !!peerDependenciesMeta[name]?.optional,
    depender,
  }));
}

export function getPackageMeta(
  packagePath: string,
  packageJson: PackageJson,
  isAncestorDevDependency: boolean
): PackageMeta {
  const { name, version } = packageJson;
  const packageMeta: PackageMeta = {
    name,
    version,
    packagePath,
    dependencies: [],
    devDependencies: [],
    optionalDependencies: [],
    peerDependencies: [],
  };

  packageMeta.dependencies = buildDependencyArray('dependencies', packageJson, packageMeta, isAncestorDevDependency);
  packageMeta.devDependencies = buildDependencyArray(
    'devDependencies',
    packageJson,
    packageMeta,
    isAncestorDevDependency
  );
  packageMeta.optionalDependencies = buildDependencyArray(
    'optionalDependencies',
    packageJson,
    packageMeta,
    isAncestorDevDependency
  );
  packageMeta.peerDependencies = buildDependencyArray(
    'peerDependencies',
    packageJson,
    packageMeta,
    isAncestorDevDependency
  );

  return packageMeta;
}

export function resolvePackageDir(basedir: string, packageName: string): string | undefined {
  let packagePath: string | undefined;

  function packageFilter(pkg: { name?: string }, pkgdir: string): { name?: string } {
    if (!packagePath && pkg.name === packageName) {
      packagePath = pkgdir;
    }
    if (!packagePath && pkgdir) {
      const expectedPath = path.sep + 'node_modules' + path.sep + packageName;
      if (pkgdir.endsWith(expectedPath) || pkgdir.endsWith(expectedPath + path.sep)) {
        packagePath = pkgdir;
      }
    }
    return pkg;
  }

  try {
    resolve.sync(packageName, { basedir, packageFilter });
  } catch {
    // resolve.sync throws if no main is present; @types/* packages often lack one
  }

  return packagePath;
}

export function getInstalledVersion(dep: Dependency): string | undefined {
  const peerDependencyDir = resolvePackageDir('.', dep.name);
  if (!peerDependencyDir) {
    return undefined;
  }
  const packageJson = readJson<PackageJson>(path.resolve(peerDependencyDir, 'package.json'));
  const isYalc = fs.existsSync(path.resolve(peerDependencyDir, 'yalc.sig'));
  return isYalc ? `${packageJson.version}-yalc` : packageJson.version;
}

export function isSameDep(a: Dependency, b: Dependency): boolean {
  const keys: Array<keyof Dependency> = [
    'name',
    'version',
    'installedVersion',
    'semverSatisfies',
    'isYalc',
    'isPeerDevDependency',
  ];
  return (
    keys.every((key) => a[key] === b[key]) &&
    a.depender.name === b.depender.name &&
    a.depender.version === b.depender.version &&
    a.depender.packagePath === b.depender.packagePath
  );
}

function uniqueVersionsForPackage(deps: Dependency[], packageName: string): string[] {
  const versions = new Set<string>();
  for (const dep of deps) {
    if (dep.name === packageName) {
      versions.add(dep.version);
    }
  }
  return [...versions];
}

export { uniqueVersionsForPackage };
