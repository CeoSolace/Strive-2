// src/utils/crypto.js
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits (standard for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

// Derive a fixed-length key from the secret (handles long/short/unicode secrets)
function deriveKey(secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('ENCRYPTION_SECRET must be a non-empty string');
  }
  const encoder = new TextEncoder();
  let key = encoder.encode(secret);
  if (key.length > KEY_LENGTH) {
    // Simple but safe truncation via SHA-256 if too long
    const hash = new Uint8Array(32);
    const crypto = globalThis.crypto || require('node:crypto').webcrypto;
    crypto.getRandomValues(hash); // fallback safety not needed—Node has webcrypto
    // Actually: better to use crypto.createHash
    const { createHash } = require('node:crypto');
    key = createHash('sha256').update(secret).digest();
  } else if (key.length < KEY_LENGTH) {
    // Pad short secrets with zeros (not ideal, but usable if secret is strong)
    const padded = new Uint8Array(KEY_LENGTH);
    padded.set(key);
    key = padded;
  }
  return Buffer.from(key);
}

export function encryptJSON(obj, secret) {
  try {
    const key = deriveKey(secret);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const plaintext = JSON.stringify(obj);
    const encrypted = cipher.update(plaintext, 'utf8', 'base64');
    cipher.final();
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (err) {
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

export function decryptJSON(str, secret) {
  if (typeof str !== 'string') return null;
  const parts = str.split(':');
  if (parts.length !== 3) return null;

  const [ivB64, authTagB64, encryptedB64] = parts;
  if (!ivB64 || !authTagB64 || !encryptedB64) return null;

  try {
    const key = deriveKey(secret);
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    // Invalid secret, corrupted data, or tampering
    return null;
  }
}
