import { createHash, createHmac, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');
export const token = () => randomBytes(32).toString('base64url');

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await (scrypt as any)(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`; // <-- Faltava esta linha de retorno!
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash || !/^[0-9a-f]{128}$/.test(hash)) return false;
  const derived = await (scrypt as any)(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
}

export const makeOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function hashOtp(challengeId: string, otp: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw Error('AUTH_SECRET deve ter pelo menos 32 caracteres');
  return createHmac('sha256', secret).update(`${challengeId}:${otp}`).digest('hex');
}

export function validOtp(challengeId: string, code: string, stored: string) {
  const got = Buffer.from(hashOtp(challengeId, code), 'hex'), expected = Buffer.from(stored, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

function encryptionKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) throw Error('TOKEN_ENCRYPTION_KEY não configurada');
  return Buffer.from(hex, 'hex');
}

export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

export function decrypt(value: string) {
  const [iv, tag, ciphertext] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
}