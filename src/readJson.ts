import { readFileSync } from 'fs';

export function readJson<T = unknown>(filename: string): T {
  return JSON.parse(readFileSync(filename, 'utf-8')) as T;
}
