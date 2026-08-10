/* ============================================================
   crypto.js — Ende-zu-Ende-Verschlüsselung der Sync-Nutzlast

   Warum überhaupt: der Ablageort (z. B. ein privater Gist) ist
   „nicht gelistet", aber nicht wirklich geheim — wer die Adresse
   kennt, sieht den Inhalt. Schulden- und Finanzdaten gehören dort
   nicht im Klartext hin. Mit einem Kennwort liegt dort nur
   Buchstabensalat.

   AES-GCM 256, Schlüssel aus dem Kennwort über PBKDF2/SHA-256.
   Nur Web Crypto, keine Abhängigkeiten.
   ============================================================ */

const ITERATIONS = 250000;
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Web Crypto gibt es nur im sicheren Kontext (https oder localhost). */
export function cryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function b64(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function unb64(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** @returns {Promise<object>} Umschlag mit Salz, IV und Chiffrat (base64) */
export async function encryptJSON(obj, passphrase) {
  if (!cryptoAvailable()) throw new Error('Verschlüsselung braucht eine https-Verbindung.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return {
    lifeos: 1,
    enc: 'AES-GCM',
    kdf: `PBKDF2-SHA256-${ITERATIONS}`,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(data),
  };
}

export async function decryptJSON(envelope, passphrase) {
  if (!isEncrypted(envelope)) return envelope;
  if (!cryptoAvailable()) throw new Error('Entschlüsselung braucht eine https-Verbindung.');
  const iterations = parseInt(String(envelope.kdf).split('-').pop(), 10) || ITERATIONS;
  const salt = unb64(envelope.salt);
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(envelope.iv) }, key, unb64(envelope.data));
  } catch {
    throw new Error('Falsches Kennwort — die Daten konnten nicht entschlüsselt werden.');
  }
  return JSON.parse(dec.decode(plain));
}

export function isEncrypted(obj) {
  return !!(obj && typeof obj === 'object' && obj.enc === 'AES-GCM' && obj.data && obj.salt && obj.iv);
}
