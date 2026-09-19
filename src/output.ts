import { formatWithOptions } from 'util';

export function escapeTerminalText(text: string): string {
  return text.replace(
    /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g,
    (character) => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')
  );
}

function formatOutput(values: unknown[]): string {
  return escapeTerminalText(formatWithOptions({ colors: false, customInspect: false }, ...values));
}

export function log(...values: unknown[]): void {
  console.log(formatOutput(values));
}

export function logError(...values: unknown[]): void {
  console.error(formatOutput(values));
}
