import Compressor from 'compressorjs';
import { arrayBufferToBase64 } from './security';

export const IMAGE_COMPRESSION_SETTINGS = {
  HIGH: {
    quality: 0.8,
    convertSize: 1024 * 1024, // 1MB
  },
  MEDIUM: {
    quality: 0.5,
    convertSize: 512 * 1024, // 500KB
  },
  LOW: {
    quality: 0.3,
    convertSize: 256 * 1024, // 250KB
  },
};

export function compressImage(
  img: Blob,
  compressionSettings: keyof typeof IMAGE_COMPRESSION_SETTINGS,
  asBase64?: true,
): Promise<string>;
export function compressImage(
  img: Blob,
  compressionSettings: keyof typeof IMAGE_COMPRESSION_SETTINGS,
  asBase64: false,
): Promise<Blob>;
export function compressImage(
  img: Blob,
  compressionSettings: keyof typeof IMAGE_COMPRESSION_SETTINGS,
  asBase64: boolean = true,
): Promise<string | Blob> {
  const { quality, convertSize } =
    IMAGE_COMPRESSION_SETTINGS[compressionSettings];
  return new Promise((resolve) => {
    new Compressor(img, {
      quality,
      strict: true,
      checkOrientation: true,
      retainExif: true,
      convertSize,
      success: async (result) => {
        if (asBase64) {
          const arrayBuffer = await result.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          resolve(base64);
        } else {
          resolve(result);
        }
      },
      error: async (error) => {
        console.error('IMG Compression Error:', error);
        if (asBase64) {
          const arrayBuffer = await img.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          resolve(base64);
        } else {
          resolve(img);
        }
      },
    });
  });
}

export const convertBase64ImageToBlob = (
  base64: string,
  contentType: string,
) => {
  const prefixMatch = base64.match(/^(data:(image\/[a-zA-Z]+);base64,)/);
  if (!prefixMatch) {
    throw new Error('Invalid base64 image string.');
  }
  const base64Data = base64.slice(prefixMatch[1].length);
  const bytes = atob(base64Data);
  const len = bytes.length;
  const array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return new Blob([array], { type: contentType });
};

export const getCompressedBase64Image = async (
  base64: string,
  compressionSettings: keyof typeof IMAGE_COMPRESSION_SETTINGS,
) => {
  const mimeType =
    base64.match(/^(data:(image\/[a-zA-Z]+);base64,)/)?.[2] || 'image/jpeg';
  const blob = convertBase64ImageToBlob(base64, mimeType);

  const compressedBase64 = await compressImage(blob, compressionSettings, true);
  return { compressedBase64, mimeType };
};

export const isValidBase64Image = (value: string) => {
  return value.match(/^(data:(image\/[a-zA-Z]+);base64,)/) !== null;
};
