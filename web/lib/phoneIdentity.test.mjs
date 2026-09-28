import test from 'node:test';
import assert from 'node:assert/strict';
import { domainUserIdFromPhone, parsePhoneInput, phoneRegion } from './phoneIdentity.ts';

test('web identity matches legacy India and full international gateway identities', () => {
  assert.equal(domainUserIdFromPhone('+919876543210'), '9876543210');
  assert.equal(domainUserIdFromPhone('+19876543210'), '+19876543210');
  assert.equal(domainUserIdFromPhone('+6591234567'), '+6591234567');
  assert.equal(domainUserIdFromPhone('9876543210'), '');
});

test('phone input retains explicit country codes, supports trunk prefixes and rejects extracted text', () => {
  assert.equal(parsePhoneInput('07400 123456', 'GB'), '+447400123456');
  assert.equal(parsePhoneInput('+65 9123 4567', 'IN'), '+6591234567');
  assert.equal(parsePhoneInput('9123 4567', 'SG'), '+6591234567');
  assert.equal(parsePhoneInput('call +65 9123 4567', 'IN'), null);
  assert.equal(phoneRegion('+6591234567'), 'SG');
});