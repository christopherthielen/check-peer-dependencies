import * as semver from 'semver';
import { exec } from 'shelljs';
import { Dependency } from './packageUtils';

function semverReverseSort(a: string, b: string): number {
  const lt = semver.lt(a, b);
  const gt = semver.gt(a, b);
  if (!lt && !gt) {
    return 0;
  }
  if (lt) {
    return 1;
  }
  return -1;
}

export interface Resolution {
  problem: Dependency;
  resolution: string | null;
  resolutionType: 'upgrade' | 'install' | 'devInstall';
}

function uniqueProblemsByName(problems: Dependency[]): Dependency[] {
  const seen = new Set<string>();
  return problems.filter((problem) => {
    if (seen.has(problem.name)) {
      return false;
    }
    seen.add(problem.name);
    return true;
  });
}

export function findPossibleResolutions(problems: Dependency[], allPeerDependencies: Dependency[]): Resolution[] {
  return uniqueProblemsByName(problems).map((problem) => {
    const shouldUpgrade = !!problem.installedVersion;
    const resolutionType = shouldUpgrade ? 'upgrade' : problem.isPeerDevDependency ? 'devInstall' : 'install';
    const resolutionVersion = findPossibleResolution(problem.name, allPeerDependencies);
    const resolution = resolutionVersion ? `${problem.name}@${resolutionVersion}` : null;

    return { problem, resolution, resolutionType };
  });
}

function findPossibleResolution(packageName: string, allPeerDeps: Dependency[]): string | undefined {
  const requiredPeerVersions = allPeerDeps.filter((dep) => dep.name === packageName);
  const command = `npm view ${packageName} versions`;
  let rawVersionsInfo: string | undefined;

  try {
    rawVersionsInfo = exec(command, { silent: true }).stdout;
    const availableVersions = (JSON.parse(rawVersionsInfo.replace(/'/g, '"')) as string[]).sort(semverReverseSort);
    return availableVersions.find((ver) =>
      requiredPeerVersions.every((peerVer) => semver.satisfies(ver, peerVer.version, { includePrerelease: true }))
    );
  } catch (err) {
    console.error(`Error while running command: '${command}'`);
    console.error(err);
    console.error();
    console.error('npm output:');
    console.error(rawVersionsInfo);
    return undefined;
  }
}
