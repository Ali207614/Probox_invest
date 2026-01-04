type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseNumericString(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  let s = value.trim();
  if (!s) return value;

  s = s.replace(/\s+/g, '');

  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);

  if (/^-?\d+([.,]\d+)+$/.test(s)) {
    const hasDot: boolean = s.includes('.');
    const hasComma: boolean = s.includes(',');

    if (hasDot && hasComma) s = s.replace(/,/g, '');
    else if (hasComma && !hasDot) s = s.replace(/,/g, '.');

    const parts: string[] = s.split('.');
    if (parts.length === 1) return Number.parseInt(parts[0], 10);

    const intPart: string = parts[0];
    const fracPart: string = parts.slice(1).join('');

    if (/^0+$/.test(fracPart)) return Number.parseInt(intPart, 10);

    const n: number = Number(s);
    return Number.isFinite(n) ? n : value;
  }

  return value;
}

function coerceValue(value: unknown): unknown {
  if (typeof value === 'string') return parseNumericString(value);

  if (Array.isArray(value)) {
    return value.map((x) => coerceValue(x));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = coerceValue(v);
    }
    return out;
  }

  return value;
}

export function coerceNumericStringsDeep<T extends Record<string, unknown>>(obj: T): T {
  const coerced = coerceValue(obj);

  return coerced as T;
}
