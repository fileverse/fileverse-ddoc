import { fromByteArray, toByteArray } from "base64-js";

export const importAESKey = async (keyString: string): Promise<CryptoKey> => {
  const keyData = { kty: "oct", k: keyString, alg: "A128GCM", ext: true };
  return await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"],
  );
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const NONCE_LENGTH = 24;

export const generateRandomNonce = (length = NONCE_LENGTH) => {
  return window.crypto.getRandomValues(new Uint8Array(length));
};

export const encryptData = async (message: string, aesKey: CryptoKey) => {
  const nonce = generateRandomNonce();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    aesKey,
    toByteArray(message),
  );

  const fullMessage = new Uint8Array(nonce.length + encrypted.byteLength);
  fullMessage.set(nonce);
  fullMessage.set(new Uint8Array(encrypted), nonce.length);

  return fromByteArray(fullMessage);
};

export const decryptData = async (encryptedMessage: string, key: CryptoKey) => {
  const messageBytes = toByteArray(encryptedMessage);
  const nonce = messageBytes.slice(0, NONCE_LENGTH);
  const encrypted = messageBytes.slice(NONCE_LENGTH, messageBytes.length);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    key,
    encrypted,
  );

  return fromByteArray(new Uint8Array(decrypted));
};
