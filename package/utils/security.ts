import { fromByteArray, toByteArray } from 'base64-js';

export const base64ToArrayBuffer = (base64String: string) => {
  const byteArray = toByteArray(base64String);

  return byteArray.buffer;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const byteArray = new Uint8Array(buffer);

  return fromByteArray(byteArray);
};

export const generateRSAKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );

  const publicKey = await window.crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey,
  );
  const privateKey = await window.crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey,
  );

  return {
    publicKey: publicKey,
    privateKey: new Uint8Array(privateKey),
  };
};

export const decryptAESKey = async (
  encryptedKeyBase64: string,
  privateKeyPem: BufferSource,
) => {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyPem,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' },
    },
    true,
    ['decrypt'],
  );

  return await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedKeyBuffer as BufferSource,
  );
};

export const decryptImageData = async (
  encryptedImageData: ArrayBuffer,
  aesKeyBuffer: ArrayBuffer,
  iv: string,
) => {
  const ivBuffer = base64ToArrayBuffer(iv);
  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    {
      name: 'AES-CBC',
    },
    true,
    ['decrypt'],
  );

  return await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: ivBuffer as BufferSource,
    },
    aesKey,
    encryptedImageData,
  );
};

export const fetchImage = async (
  url: string,
): Promise<ArrayBuffer | undefined> => {
  try {
    const response = await fetch(url);

    if (!response?.ok) {
      console.error('Failed to fetch image: ', response.statusText);
      return;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error during image fetch: ', error);
  }
};

type DecryptImage = {
  encryptedKey: string;
  privateKey: BufferSource;
  iv: string;
  imageBuffer: ArrayBuffer;
};

export const decryptImage = async ({
  encryptedKey,
  privateKey,
  iv,
  imageBuffer,
}: DecryptImage) => {
  try {
    const aesKeyBuffer = await decryptAESKey(encryptedKey, privateKey);

    return await decryptImageData(imageBuffer, aesKeyBuffer, iv);
  } catch (error) {
    console.error('Error decrypting and displaying the image:', error);
  }
};
