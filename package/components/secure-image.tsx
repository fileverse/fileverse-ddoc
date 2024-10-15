import { useState, useEffect, forwardRef } from 'react';
import {
  fetchImage,
  decryptImage,
  arrayBufferToBase64,
} from '../utils/security.ts';
import { toByteArray } from 'base64-js';

type Props = {
  encryptedKey: string;
  url: string;
  iv: string;
  privateKey: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
};

export const SecureImage = forwardRef<HTMLImageElement, Props>(
  (
    {
      encryptedKey,
      url,
      iv,
      privateKey,
      alt,
      className,
      width,
      height,
    },
    ref,
  ) => {
    const [imageData, setImageData] = useState<string>('');

    useEffect(() => {
      const imageReadyForDecryption = encryptedKey && url && iv && privateKey;

      if (imageReadyForDecryption) {
        const handleDecryptImage = async () => {
          try {
            const imageBuffer = await fetchImage(url);

            if (!imageBuffer) {
              return;
            }

            const result = await decryptImage({
              encryptedKey,
              privateKey: toByteArray(privateKey),
              iv,
              imageBuffer,
            });
            const src = `data:image/jpeg;base64,${arrayBufferToBase64(
              result as ArrayBuffer,
            )}`;

            setImageData(src);
          } catch (error) {
            console.error('Error decrypting image:', error);
          }
        };

        handleDecryptImage();
      }
    }, [encryptedKey, url, iv, privateKey]);

    return (
      <img
        src={imageData}
        alt={alt}
        className={className}
        width={width}
        height={height}
        ref={ref}
      />
    );
  },
);
