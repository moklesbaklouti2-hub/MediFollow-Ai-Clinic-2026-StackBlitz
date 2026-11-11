// Preparatory credential verification. NOT connected to any production login route.
// Never commit actual password hashes, credentials, or plaintext passwords.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_PASSWORD_BYTES = 1024;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function acceptable(password: unknown): password is string {
  return typeof password === 'string' && Buffer.byteLength(password, 'utf8') >= 12
    && Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES;
}

export async function hashDoctorPassword(password: string): Promise<string> {
  if (!acceptable(password)) throw new Error('Password must be 12-1024 UTF-8 bytes.');
  const salt = randomBytes(SALT_BYTES);
  const key = (await scrypt(password, salt, KEY_BYTES, SCRYPT_OPTIONS)) as Buffer;
  return ['scrypt', 'v1', salt.toString('hex'), key.toString('hex')].join('$');
}

export async function verifyDoctorPassword(password: unknown, encoded: unknown): Promise<boolean> {
  if (!acceptable(password) || typeof encoded !== 'string') return false;
  const match = /^scrypt\$v1\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(encoded);
  if (!match) return false;
  const salt = Buffer.from(match[1], 'hex');
  const expected = Buffer.from(match[2], 'hex');
  const actual = (await scrypt(password, salt, KEY_BYTES, SCRYPT_OPTIONS)) as Buffer;
  return timingSafeEqual(actual, expected);
}
