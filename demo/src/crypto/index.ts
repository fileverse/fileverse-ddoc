import {
  generateECKeyPair,
  eciesDecrypt,
  eciesEncrypt,
} from '@fileverse/crypto/ecies';
import { generateRandomBytes } from '@fileverse/crypto/utils';
import { secp256k1 } from '@noble/curves/secp256k1';

export const crypto = {
  generateKeyPair: () => {
    return generateECKeyPair();
  },
  encryptData: (key: Uint8Array, message: Uint8Array) => {
    const pubKey = secp256k1.getPublicKey(key);

    return eciesEncrypt(pubKey, message, 'base64');
  },
  decryptData: (key: Uint8Array, message: string) => {
    return eciesDecrypt(key, message);
  },
  generateRandomBytes,
};
