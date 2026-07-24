import { toUint8Array } from 'js-base64';
import { crypto } from './index';

// Outer wrap of the rotation relay: the same ECIES the collab wire uses, keyed by a base64
// roomKey string. Owner encrypts under the pre-rotation roomKey; members decrypt with it.
export const encryptForRoomKey = (roomKey: string, bytes: Uint8Array): string =>
  crypto.encryptData(toUint8Array(roomKey), bytes);

export const decryptForRoomKey = (
  roomKey: string,
  ciphertext: string,
): Uint8Array => crypto.decryptData(toUint8Array(roomKey), ciphertext);
