import * as semver from 'semver';
import { execFileSync } from 'child_process';
import { Dependency } from './packageUtils';
import { getPackageManagerProcess } from './packageManagerProcess';
import { logError } from './output';

function semverReverseSort(a, b) {
  const lt = semver.lt(a, b);
  const gt = semver.gt(a, b);
  if (!lt && !gt) {
    return 0;
  } else if (lt) {
    return 1;
  }
  return -1;
}

export interface Resolution {
  problem: Dependency;
  resolution: string;
  resolutionType: 'upgrade' | 'install' | 'devInstall';
}

export function findPossibleResolutions(problems: Dependency[], allPeerDependencies: Dependency[]): Resolution[] {
  const uniq: Dependency[] = problems.reduce(
    (acc, problem) => (acc.some((dep) => dep.name === problem.name) ? acc : acc.concat(problem)),
    []
  );
  return uniq.map((problem) => {
    const shouldUpgrade = !!problem.installedVersion;
    const resolutionType = shouldUpgrade ? 'upgrade' : problem.isPeerDevDependency ? 'devInstall' : 'install';
    const resolutionVersion = findPossibleResolution(problem.name, allPeerDependencies);
    const resolution = resolutionVersion ? `${problem.name}@${resolutionVersion}` : null;

    return { problem, resolution, resolutionType } as Resolution;
  });
}

function findPossibleResolution(packageName, allPeerDeps) {
  const requiredPeerVersions = allPeerDeps.filter((dep) => dep.name === packageName);
  // todo: skip this step if only one required peer version and it's an exact version
  // Only registry package names are valid here, never options, paths, URLs or package specs.
  const packageNamePattern = /^(?:@[a-zA-Z0-9~][a-zA-Z0-9._~-]*\/)?[a-zA-Z0-9~][a-zA-Z0-9._~-]*$/;
  if (
    typeof packageName !== 'string' ||
    /\s/.test(packageName) ||
    !packageNamePattern.test(packageName) ||
    (!packageName.startsWith('@') && /\.(?:tgz|tar\.gz|tar)$/i.test(packageName))
  ) {
    logError(`Invalid peer dependency package name: ${JSON.stringify(packageName)}`);
    return;
  }
  let rawVersionsInfo;
  try {
    const command = getPackageManagerProcess('npm', ['view', packageName, 'versions', '--json']);
    rawVersionsInfo = execFileSync(command.executable, command.args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsedVersions = JSON.parse(rawVersionsInfo);
    // npm may return a single version as a string.
    const versions = typeof parsedVersions === 'string' ? [parsedVersions] : parsedVersions;
    if (!Array.isArray(versions) || versions.some((version) => typeof version !== 'string' || !semver.valid(version))) {
      throw new Error('npm returned an invalid versions response');
    }
    const availableVersions = versions.sort(semverReverseSort);
    return availableVersions.find((ver) =>
      requiredPeerVersions.every((peerVer) => {
        return semver.satisfies(ver, peerVer.version, { includePrerelease: true });
      })
    );
  } catch (err) {
    logError(`Error fetching npm versions for ${JSON.stringify(packageName)}`);
    logError(err);
    logError();
    logError('npm output:');
    logError(rawVersionsInfo);
  }
}
