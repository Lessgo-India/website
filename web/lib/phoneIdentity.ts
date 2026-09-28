import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export function domainUserIdFromPhone(value: string): string {
  if (!/^\+[1-9]\d{6,14}$/.test(value)) return '';
  const phone = parsePhoneNumberFromString(value);
  if (!phone?.isPossible()) return '';
  return phone.countryCallingCode === '91' && phone.nationalNumber.length === 10 ? phone.nationalNumber : phone.number;
}

export function parsePhoneInput(value: string, country: CountryCode): string | null {
  const raw = value.trim();
  if (!raw || raw.length > 64 || !/^[+\d\s().-]+$/.test(raw)) return null;
  const phone = parsePhoneNumberFromString(raw, { defaultCountry: country, extract: false });
  return phone?.isValid() && !phone.ext ? phone.number : null;
}

export function phoneRegion(value: string): CountryCode {
  return parsePhoneNumberFromString(value)?.country ?? 'IN';
}

export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}