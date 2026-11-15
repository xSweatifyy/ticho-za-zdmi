const ENC_PREFIX = 'enc:v1:';
const APP_CRYPTO_MATERIAL = 'ticho-za-zdmi-cz-sk-privacy-envelope-v1-2026';

let cachedKeyPromise: Promise<CryptoKey> | null = null;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getAesKey(): Promise<CryptoKey> {
  if (cachedKeyPromise) return cachedKeyPromise;

  cachedKeyPromise = (async () => {
    const encoder = new TextEncoder();
    const rawHash = await window.crypto.subtle.digest(
      'SHA-256',
      encoder.encode(APP_CRYPTO_MATERIAL)
    );
    return window.crypto.subtle.importKey(
      'raw',
      rawHash,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  })();

  return cachedKeyPromise;
}

export async function encryptText(plainText: string): Promise<string> {
  if (!plainText) return '';
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return plainText;
  }
  try {
    const key = await getAesKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    return `${ENC_PREFIX}${toBase64Url(iv)}:${toBase64Url(new Uint8Array(cipherBuffer))}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return plainText;
  }
}

export async function decryptText(payload: string | undefined | null): Promise<string> {
  if (!payload) return '';
  if (!payload.startsWith(ENC_PREFIX)) return payload;
  if (typeof window === 'undefined' || !window.crypto?.subtle) return payload;

  try {
    const rest = payload.slice(ENC_PREFIX.length);
    const sepIdx = rest.indexOf(':');
    if (sepIdx === -1) return payload;

    const ivPart = rest.slice(0, sepIdx);
    const cipherPart = rest.slice(sepIdx + 1);
    const iv = fromBase64Url(ivPart);
    const cipherBytes = fromBase64Url(cipherPart);

    const key = await getAesKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    return '[Šifrovaný obsah nelze dešifrovat]';
  }
}

export function isEncryptedPayload(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(ENC_PREFIX));
}
