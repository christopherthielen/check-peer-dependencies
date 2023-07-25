import { readFileSync } from 'fs';

interface ConfigJson {
  enforcedPackages?: string[];
  ignoredBranchPrefixes?: string[];
  launchdarklyClientId?: string;
}

export function readJson(filename: string) {
  return JSON.parse(readFileSync(filename).toString('utf-8'));
}

export function getConfig(configPath: string): ConfigJson {
  try {
    return readJson(configPath);
  } catch(error) {
    console.log(error)
    return {};
  }
}

