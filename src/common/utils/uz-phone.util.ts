import { extractDigits } from './phone-digits.util';

export function normalizeUzPhone(phone: string): {
  raw: string;
  digits: string;
  last9: string;
} {
  const digits = extractDigits(phone);

  if (digits.length < 9) {
    throw new Error('Invalid phone number');
  }

  const last9 = digits.slice(-9);

  return {
    raw: phone,
    digits,
    last9,
  };
}
