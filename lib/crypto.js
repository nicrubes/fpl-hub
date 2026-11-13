// Passcode-based AES-256-GCM encryption, compatible with the browser's WebCrypto.
// Used to lock the website and the FPL Form files stored in the public GitHub project.
import { webcrypto as crypto } from 'node:crypto';

export const ITERATIONS = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = buf => Buffer.from(buf).toString('base64');
const ub64 = s => new Uint8Array(Buffer.from(s, 'base64'));

async function keyFor(passcode, salt, iterations, usage) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

// Returns a small object {s, i, c, n} (all base64 except n) that can be stored as JSON.
export async function encryptText(text, passcode) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(passcode, salt, ITERATIONS, 'encrypt');
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { s: b64(salt), i: b64(iv), c: b64(cipher), n: ITERATIONS };
}

export async function decryptText(payload, passcode) {
  const key = await keyFor(passcode, ub64(payload.s), payload.n, 'decrypt');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(payload.i) }, key, ub64(payload.c));
  return dec.decode(plain);
}
