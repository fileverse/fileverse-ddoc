import { describe, it, expect } from 'vitest';
import { fromUint8Array } from 'js-base64';
import { encryptForRoomKey, decryptForRoomKey } from './room-key';

describe('roomKey outer wrap', () => {
  it('round-trips bytes under a base64 roomKey', () => {
    const roomKey = fromUint8Array(new Uint8Array(32).fill(7), true);
    const msg = new TextEncoder().encode('hello-rotation');
    const ct = encryptForRoomKey(roomKey, msg);
    expect(typeof ct).toBe('string');
    expect(new TextDecoder().decode(decryptForRoomKey(roomKey, ct))).toBe(
      'hello-rotation',
    );
  });
});
