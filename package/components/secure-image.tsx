import React, { FC, useState, useEffect } from 'react';
import { fetchImage, decryptImage, arrayBufferToBase64 } from '../utils/security.ts';

type Props = {
  encryptedKey: string;
  url: string;
  iv: string;
  privateKey: ArrayBuffer;
  alt?: string;
};

export const SecureImage: FC<Props> = ({
  encryptedKey,
  url,
  iv,
  privateKey,
  alt
}) => {
  const [imageData, setImageData] = useState<string>(null);

  useEffect(() => {
    const imageReadyForDecryption = encryptedKey && url && iv && privateKey;

    if (imageReadyForDecryption) {
      const handleDecryptImage = async () => {
        try {
          const imageBuffer = await fetchImage(url);
          const result = await decryptImage({
            encryptedKey,
            privateKey,
            iv,
            imageBuffer
          });
          const src = `data:image/jpeg;base64,${arrayBufferToBase64(result)}`;

          setImageData(src);
        } catch (error) {
          console.error('Error decrypting image:', error);
        }
      };

      handleDecryptImage();
    }
  }, [encryptedKey, url, iv, privateKey]);

  return (
    <img src={imageData} alt={alt} />
  );
};
