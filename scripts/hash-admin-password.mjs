#!/usr/bin/env node
/**
 * Generates an `ADMIN_USERS` entry for the admin dashboard.
 *
 *   node scripts/hash-admin-password.mjs
 *
 * Prompts for a phone number and password, then prints a line to paste into the
 * website's env. The password itself is never written anywhere — only a scrypt
 * hash of the value the browser derives from it.
 *
 * ⚠️ PBKDF2 settings below MUST match `web/lib/adminCredential.ts`. If either
 * side changes, every stored credential must be regenerated.
 */
import { createInterface } from 'node:readline';
import { pbkdf2, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { stdin, stdout } from 'node:process';

const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_DIGEST = 'sha256';
const CREDENTIAL_BYTES = 32;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const pbkdf2Async = promisify(pbkdf2);
const scryptAsync = promisify(scrypt);

const rl = createInterface({ input: stdin, output: stdout });

// Suppress the echo for password prompts. Overriding readline's own writer
// keeps a single input consumer, which raw-mode listeners would fight over.
let muted = false;
const write = rl._writeToOutput?.bind(rl);
rl._writeToOutput = (text) => {
  if (!muted) write?.(text);
};

// Buffer every line as it arrives. A piped stdin delivers all of them at once,
// so prompts that attach a listener later would otherwise miss their input.
const pending = [];
const waiting = [];
rl.on('line', (line) => {
  const waiter = waiting.shift();
  if (waiter) waiter(line);
  else pending.push(line);
});

function nextLine() {
  if (pending.length) return Promise.resolve(pending.shift());
  return new Promise((resolve) => waiting.push(resolve));
}

async function ask(question) {
  stdout.write(question);
  return nextLine();
}

async function askHidden(question) {
  stdout.write(question);
  muted = true;
  const value = await nextLine();
  muted = false;
  stdout.write('\n');
  return value;
}

const rawPhone = await ask('Phone number (10 digits): ');
const phone = rawPhone.replace(/\D/g, '').slice(-10);

if (phone.length !== 10) {
  console.error('\nThat is not a 10-digit phone number.');
  rl.close();
  process.exit(1);
}

const password = await askHidden('Password: ');
const confirm = await askHidden('Confirm password: ');
rl.close();

if (password !== confirm) {
  console.error('\nPasswords do not match.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('\nUse at least 12 characters — this is the only thing guarding production data.');
  process.exit(1);
}

// Step 1: exactly what the browser will compute and send.
const credential = (
  await pbkdf2Async(
    password,
    `lessgo-admin:v1:${phone}`,
    PBKDF2_ITERATIONS,
    CREDENTIAL_BYTES,
    PBKDF2_DIGEST,
  )
).toString('hex');

// Step 2: what the server stores, so a leaked env is not directly replayable.
const salt = randomBytes(16);
const hash = await scryptAsync(credential, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);

console.log('\nAdd this to ADMIN_USERS (comma-separate multiple operators):\n');
console.log(`${phone}:${salt.toString('hex')}:${hash.toString('hex')}\n`);
console.log('And make sure ADMIN_SESSION_SECRET is set, e.g.:\n');
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
