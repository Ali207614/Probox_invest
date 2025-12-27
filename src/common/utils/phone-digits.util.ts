export function extractDigits(value: string): string {
  return value.replace(/\D+/g, '');
}
