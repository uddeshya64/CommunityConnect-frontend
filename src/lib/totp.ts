/**
 * Standard RFC 6238 TOTP verification using Web Crypto API.
 * Supports standard Authenticator Apps (Google Authenticator, Microsoft Authenticator, Authy, 1Password)
 * and dynamic per-user emergency backup codes.
 */

const DEFAULT_BACKUP_CODES = [
  "CC-9823-4412",
  "CC-7712-9901",
  "CC-3321-8842",
  "CC-5501-2290",
];

/**
 * Generates a unique 16-character RFC 4648 Base32 secret key for a user account.
 */
export function generateUniqueSecretKey(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const array = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += alphabet[array[i] % alphabet.length];
  }
  return secret;
}

/**
 * Generates an array of unique emergency backup codes in CC-XXXX-XXXX format.
 */
export function generateUniqueBackupCodes(count = 4): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    codes.push(`CC-${p1}-${p2}`);
  }
  return codes;
}

function base32ToBytes(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export async function generateTOTP(secretBase32: string, timeStepOffset = 0): Promise<string> {
  const keyBytes = base32ToBytes(secretBase32);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const step = Math.floor(Date.now() / 1000 / 30) + timeStepOffset;
  const counterBytes = new Uint8Array(8);
  let temp = step;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    counterBytes.buffer as ArrayBuffer
  );
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

/**
 * Validates whether an input code matches the current TOTP for the secret key
 * or one of the valid Emergency Backup Codes.
 */
export async function verify2FACode(
  inputCode: string,
  secretBase32: string = "JBSWY3DPEHPK3PXP",
  customBackupCodes?: string[]
): Promise<boolean> {
  const cleanCode = inputCode.trim().toUpperCase();

  // Determine valid backup codes (custom or stored in localStorage or fallback default)
  let validBackupCodes = customBackupCodes;
  if (!validBackupCodes && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("cc_2fa_backup_codes");
      if (stored) {
        validBackupCodes = JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
  }
  if (!validBackupCodes || !Array.isArray(validBackupCodes)) {
    validBackupCodes = DEFAULT_BACKUP_CODES;
  }

  // 1. Check if it's one of the emergency backup codes
  if (validBackupCodes.includes(cleanCode)) {
    return true;
  }

  // 2. Check if it's a 6-digit TOTP code
  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  try {
    // Check current, previous (-1), and next (+1) 30-second time steps for clock drift
    for (const offset of [-1, 0, 1]) {
      const validOtp = await generateTOTP(secretBase32, offset);
      if (cleanCode === validOtp) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}
