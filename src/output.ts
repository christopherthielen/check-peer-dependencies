import { formatWithOptions } from 'util';

export function escapeTerminalText(text: string): string {
  // Package metadata can contain terminal controls, misleading line breaks, or text direction changes.
  // Show those characters as text so they can't alter the terminal or forge output.
  return text.replace(
    /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g,
    (character) => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')
  );
}

function escapeErrorStack(error: Error): string {
  const header = error.message ? `${error.name}: ${error.message}` : error.name;
  const stack = error.stack || header;
  if (!stack.startsWith(header)) {
    return escapeTerminalText(stack);
  }

  // The message can contain fake stack frames, so separate it before preserving V8's frame layout.
  const frames = stack.slice(header.length).split('\n    at ');
  return escapeTerminalText(header) + frames.map(escapeTerminalText).join('\n    at ');
}

function escapeValue(value: unknown, seen: WeakMap<object, unknown>, depth = 4): unknown {
  if (typeof value === 'string') return escapeTerminalText(value);
  if (typeof value === 'symbol') return escapeTerminalText(String(value));
  if (typeof value === 'function') return escapeTerminalText(`[Function: ${value.name}]`);
  if (Buffer.isBuffer(value)) return escapeTerminalText(value.toString('utf8'));
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  // Copy values so logging leaves them alone, and reuse copies for circular references.
  const escaped =
    value instanceof Error ? new Error(escapeTerminalText(value.message)) : Array.isArray(value) ? [] : {};
  seen.set(value, escaped);
  if (value instanceof Error && escaped instanceof Error) {
    Object.defineProperty(escaped, 'name', { value: escapeTerminalText(value.name), configurable: true });
    escaped.stack = escapeErrorStack(value);
  }
  // util.format inspects objects to at most four levels, including the %o format.
  if (depth < 0) return escaped;

  // Read descriptors so logging doesn't run getters.
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (value instanceof Error && ['name', 'message', 'stack'].includes(key)) continue;
    if (!descriptor.enumerable && !(value instanceof Error && key === 'cause')) continue;
    Object.defineProperty(escaped, escapeTerminalText(key), {
      value: 'value' in descriptor ? escapeValue(descriptor.value, seen, depth - 1) : '[Getter]',
      enumerable: descriptor.enumerable,
      configurable: true,
      writable: true,
    });
  }
  return escaped;
}

function formatOutput(values: unknown[]): string {
  // Escape the data first, then let the formatter add readable line breaks.
  const seen = new WeakMap<object, unknown>();
  return formatWithOptions({ colors: false, customInspect: false }, ...values.map((value) => escapeValue(value, seen)));
}

export function log(...values: unknown[]): void {
  console.log(formatOutput(values));
}

export function logError(...values: unknown[]): void {
  console.error(formatOutput(values));
}
