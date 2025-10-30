/**
 * Client-Side Encryption Utility
 *
 * Uses Web Crypto API (SubtleCrypto) for AES-GCM encryption
 * - Native browser API (no external dependencies)
 * - Hardware-accelerated (very fast, no UI delays)
 * - Military-grade AES-256-GCM encryption
 * - Authenticated encryption (prevents tampering)
 *
 * Security Features:
 * - 256-bit encryption key
 * - Unique IV (initialization vector) per encryption
 * - PBKDF2 key derivation from master secret
 * - Base64 encoding for Firebase storage
 */

// Configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Cache for derived key (avoid re-deriving on every operation)
let cachedCryptoKey: CryptoKey | null = null;

/**
 * Get encryption key from environment variable or generate one
 * IMPORTANT: Set NEXT_PUBLIC_ENCRYPTION_SECRET in your .env file
 */
function getMasterSecret(): string {
  const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;

  if (!secret) {
    console.warn('⚠️  ENCRYPTION_SECRET not set! Using fallback (NOT SECURE FOR PRODUCTION)');
    // Fallback for development - replace with proper secret in production
    return 'curez-dev-encryption-key-please-change-in-production-2024';
  }

  if (secret.length < 32) {
    throw new Error('Encryption secret must be at least 32 characters long');
  }

  return secret;
}

/**
 * Derive a cryptographic key from the master secret using PBKDF2
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  // Check cache first
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }

  const masterSecret = getMasterSecret();
  const encoder = new TextEncoder();

  // Import master secret as a key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterSecret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  cachedCryptoKey = key;
  return key;
}

/**
 * Generate a fixed salt from user ID (consistent encryption key per user)
 * This allows the same key to decrypt data without storing the salt
 */
function generateSaltFromUserId(userId: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(`curez-salt-${userId}`);

  // Create a fixed-length salt from user ID
  const salt = new Uint8Array(SALT_LENGTH);
  for (let i = 0; i < SALT_LENGTH; i++) {
    salt[i] = data[i % data.length] ^ (i * 7); // XOR with position for entropy
  }

  return salt;
}

/**
 * Encrypt a string value
 * Returns base64-encoded string: `iv.encryptedData`
 */
export async function encryptField(value: string, userId: string): Promise<string> {
  if (!value || value.trim() === '') {
    return ''; // Don't encrypt empty strings
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);

    // Generate unique IV for this encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from user ID
    const salt = generateSaltFromUserId(userId);
    const key = await deriveKey(salt);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value
 * Expects base64-encoded string from encryptField()
 */
export async function decryptField(encryptedValue: string, userId: string): Promise<string> {
  if (!encryptedValue || encryptedValue.trim() === '') {
    return ''; // Return empty string for empty input
  }

  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedValue)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);

    // Derive key from user ID
    const salt = generateSaltFromUserId(userId);
    const key = await deriveKey(salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    );

    // Decode UTF-8
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return empty string instead of throwing (graceful degradation)
    return '';
  }
}

/**
 * Encrypt an object (JSON)
 * Encrypts the entire JSON as a string
 */
export async function encryptObject(obj: any, userId: string): Promise<string> {
  const json = JSON.stringify(obj);
  return encryptField(json, userId);
}

/**
 * Decrypt an object (JSON)
 */
export async function decryptObject<T>(encryptedValue: string, userId: string): Promise<T | null> {
  try {
    const json = await decryptField(encryptedValue, userId);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Object decryption error:', error);
    return null;
  }
}

/**
 * Encrypt specific fields in an object
 * Returns a new object with encrypted fields
 */
export async function encryptFields(
  obj: Record<string, any>,
  fieldsToEncrypt: string[],
  userId: string
): Promise<Record<string, any>> {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      // Handle nested objects (e.g., "profile.name")
      const keys = field.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      const value = current[lastKey];

      if (typeof value === 'string') {
        current[lastKey] = await encryptField(value, userId);
      } else if (typeof value === 'object') {
        current[lastKey] = await encryptObject(value, userId);
      }
    }
  }

  return result;
}

/**
 * Decrypt specific fields in an object
 * Returns a new object with decrypted fields
 */
export async function decryptFields(
  obj: Record<string, any>,
  fieldsToDecrypt: string[],
  userId: string
): Promise<Record<string, any>> {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      const keys = field.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) continue;
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      const value = current[lastKey];

      if (typeof value === 'string' && value.trim() !== '') {
        try {
          // Try to decrypt as object first
          const obj = await decryptObject(value, userId);
          current[lastKey] = obj !== null ? obj : await decryptField(value, userId);
        } catch {
          // Fall back to string decryption
          current[lastKey] = await decryptField(value, userId);
        }
      }
    }
  }

  return result;
}

/**
 * Helper: Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;
}

/**
 * Helper: Generate a secure random encryption secret (for initial setup)
 * Run this once and save the output to .env
 */
export function generateEncryptionSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Export types for TypeScript
export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyLength: number;
}

export function getEncryptionConfig(): EncryptionConfig {
  return {
    enabled: isEncryptionEnabled(),
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
  };
}