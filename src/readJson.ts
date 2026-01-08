import { readFileSync } from 'fs';
export function readJson(filename: string) {
  return JSON.parse(readFileSync(filename).toString('utf-8'));
}
