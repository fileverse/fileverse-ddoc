import { fromByteArray, toByteArray } from 'base64-js';

export const base64ToArrayBuffer = (base64String: string) => {
  const byteArray = toByteArray(base64String);

  return byteArray.buffer;
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const byteArray = new Uint8Array(buffer);

  return fromByteArray(byteArray);
}

export const generateRSAKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: publicKey,
    privateKey: privateKey
  };
}

export const decryptAESKey = async (encryptedKeyBase64, privateKeyPem) => {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyPem,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" }
    },
    true,
    ["decrypt"]
  );

  return await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encryptedKeyBuffer
  );
}

export const decryptImageData = async (encryptedImageData, aesKeyBuffer, ivBuffer) => {
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    {
      name: "AES-CBC"
    },
    true,
    ["decrypt"]
  );

  return await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: ivBuffer
    },
    aesKey,
    encryptedImageData
  );
}