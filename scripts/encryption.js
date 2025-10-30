/**
 * Server-Side Encryption Utility (Node.js)
 * 
 * Uses Node.js crypto module for AES-256-GCM encryption
 * - Same algorithm as client-side for compatibility
 * - Synchronized encryption/decryption with frontend
 * - Optimized for server-side performance
 */

const crypto = require('crypto');

// Configuration (must match client-side)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

// Cache for derived keys (per user)
const keyCache = new Map();

/**
 * Get encryption secret from environment
 */
function getMasterSecret() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;
  
  if (!secret) {
    console.warn('⚠️  ENCRYPTION_SECRET not set! Using fallback (NOT SECURE FOR PRODUCTION)');
    return 'curez-dev-encryption-key-please-change-in-production-2024';
  }
  
  if (secret.length < 32) {
    throw new Error('Encryption secret must be at least 32 characters long');
  }
  
  return secret;
}

/**
 * Generate a fixed salt from user ID (same as client)
 */
function generateSaltFromUserId(userId) {
  const data = Buffer.from(`curez-salt-${userId}`, 'utf8');
  const salt = Buffer.alloc(SALT_LENGTH);
  
  for (let i = 0; i < SALT_LENGTH; i++) {
    salt[i] = data[i % data.length] ^ (i * 7);
  }
  
  return salt;
}

/**
 * Derive encryption key from master secret (cached per user)
 */
function deriveKey(userId) {
  // Check cache
  if (keyCache.has(userId)) {
    return keyCache.get(userId);
  }
  
  const masterSecret = getMasterSecret();
  const salt = generateSaltFromUserId(userId);
  
  const key = crypto.pbkdf2Sync(
    masterSecret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
  
  keyCache.set(userId, key);
  return key;
}

/**
 * Encrypt a string value
 * Returns base64-encoded string: `iv.authTag.encryptedData`
 */
function encryptField(value, userId) {
  if (!value || value.trim() === '') {
    return '';
  }
  
  try {
    const key = deriveKey(userId);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(value, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine: iv + authTag + encrypted
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value
 */
function decryptField(encryptedValue, userId) {
  if (!encryptedValue || encryptedValue.trim() === '') {
    return '';
  }
  
  // If it doesn't look like base64 encrypted data, return as-is (old unencrypted data)
  if (typeof encryptedValue !== 'string') {
    return String(encryptedValue);
  }
  
  try {
    const key = deriveKey(userId);
    const combined = Buffer.from(encryptedValue, 'base64');
    
    // Check if the data has the expected minimum length
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    if (combined.length < minLength) {
      // Too short to be encrypted data, likely unencrypted
      return encryptedValue;
    }
    
    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Validate auth tag length
    if (authTag.length !== AUTH_TAG_LENGTH) {
      // Invalid auth tag, likely unencrypted data
      return encryptedValue;
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // Decryption failed - likely old unencrypted data
    // Return original value for backward compatibility
    console.warn(`Decryption failed for value, returning original: ${error.message}`);
    return encryptedValue;
  }
}

/**
 * Encrypt an object (JSON)
 */
function encryptObject(obj, userId) {
  const json = JSON.stringify(obj);
  return encryptField(json, userId);
}

/**
 * Decrypt an object (JSON)
 */
function decryptObject(encryptedValue, userId) {
  try {
    const json = decryptField(encryptedValue, userId);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Object decryption error:', error);
    return null;
  }
}

/**
 * Encrypt specific fields in an object
 */
function encryptFields(obj, fieldsToEncrypt, userId) {
  const result = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      const keys = field.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      const value = current[lastKey];
      
      if (typeof value === 'string') {
        current[lastKey] = encryptField(value, userId);
      } else if (typeof value === 'object') {
        current[lastKey] = encryptObject(value, userId);
      }
    }
  }
  
  return result;
}

/**
 * Decrypt specific fields in an object
 */
function decryptFields(obj, fieldsToDecrypt, userId) {
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
          const obj = decryptObject(value, userId);
          current[lastKey] = obj !== null ? obj : decryptField(value, userId);
        } catch {
          current[lastKey] = decryptField(value, userId);
        }
      }
    }
  }
  
  return result;
}

/**
 * Check if encryption is enabled
 */
function isEncryptionEnabled() {
  return !!(process.env.ENCRYPTION_SECRET || process.env.NEXT_PUBLIC_ENCRYPTION_SECRET);
}

/**
 * Encrypt an array of strings
 * @param {string[]} array - Array of strings to encrypt
 * @param {string} userId - User ID for key derivation
 * @returns {Promise<string[]>} - Array of encrypted strings
 */
async function encryptArray(array, userId) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }
  
  try {
    const encrypted = await Promise.all(
      array.map(item => {
        if (item === null || item === undefined) return '';
        return encryptField(String(item), userId);
      })
    );
    
    return encrypted.filter(item => item !== ''); // Remove empty strings
  } catch (error) {
    console.error('Error encrypting array:', error);
    throw error;
  }
}

/**
 * Decrypt an array of encrypted strings
 * @param {string[]} encryptedArray - Array of encrypted strings
 * @param {string} userId - User ID for key derivation
 * @returns {Promise<string[]>} - Array of decrypted strings
 */
async function decryptArray(encryptedArray, userId) {
  if (!Array.isArray(encryptedArray) || encryptedArray.length === 0) {
    return [];
  }
  
  try {
    const decrypted = await Promise.all(
      encryptedArray.map(async (item) => {
        if (item === null || item === undefined || item === '') return '';
        
        // Check if item looks encrypted (base64 with proper length)
        // If it doesn't look encrypted, return as-is (old unencrypted data)
        if (typeof item !== 'string' || item.length < IV_LENGTH + AUTH_TAG_LENGTH) {
          return String(item); // Return unencrypted data as-is
        }
        
        try {
          const decrypted = await decryptField(item, userId);
          return decrypted || String(item); // Fallback to original if decryption fails
        } catch (error) {
          // If decryption fails, it's probably unencrypted old data
          return String(item);
        }
      })
    );
    
    return decrypted.filter(item => item !== ''); // Remove empty strings
  } catch (error) {
    console.error('Error decrypting array:', error);
    // Return original array on error (backward compatibility)
    return encryptedArray.filter(item => item !== '');
  }
}

/**
 * Generate a secure random encryption secret
 */
function generateEncryptionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encryptField,
  decryptField,
  encryptObject,
  decryptObject,
  encryptFields,
  decryptFields,
  encryptArray,
  decryptArray,
  isEncryptionEnabled,
  generateEncryptionSecret,
};
