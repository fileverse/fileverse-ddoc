import { useState, useEffect, forwardRef } from 'react';
import { fetchImage, decryptImage } from '../utils/security.ts';
import { toByteArray } from 'base64-js';
import { Skeleton } from '@fileverse/ui';

type Props = {
  encryptedKey: string;
  url: string;
  iv: string;
  privateKey: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
  caption?: string;
};

export const SecureImage = forwardRef<HTMLImageElement, Props>(
  (
    {
      encryptedKey,
      url,
      iv,
      privateKey,
      alt,
      // caption,
      className,
      width,
      height,
    },
    ref,
  ) => {
    const [source, setSource] = useState<string>('');
    useEffect(() => {
      const imageReadyForDecryption = encryptedKey && url && iv && privateKey;
      let isMounted = true;
      let currentObjectUrl: string | null = null;
      if (imageReadyForDecryption) {
        const decryptAndSetImage = async () => {
          try {
            const imageBuffer = await fetchImage(url);
            if (!imageBuffer || !isMounted) return;

            const decryptedArrayBuffer = await decryptImage({
              encryptedKey,
              privateKey: toByteArray(privateKey),
              iv,
              imageBuffer,
            });
            if (!isMounted || !decryptedArrayBuffer) return;

            const blob = new Blob([decryptedArrayBuffer], {
              type: 'image/jpeg',
            });
            currentObjectUrl = URL.createObjectURL(blob);
            // add check before setting state
            // in order to prevent react errors / warning that occurs when you set state when component is unmounting
            if (isMounted) {
              setSource(currentObjectUrl);
            }
          } catch (error) {
            console.error('Error decrypting image:', error);
          }
        };

        decryptAndSetImage();
      }

      return () => {
        isMounted = false;
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
        }
      };
    }, [encryptedKey, url, iv, privateKey]);

    return source ? (
      <img
        src={source}
        alt={alt}
        className={className}
        width={width}
        height={height}
        ref={ref}
      />
    ) : (
      <Skeleton className={`w-[500px] h-[300px] rounded-lg`} />
    );

    // TODO: For figure caption later
    //   <figure>
    //   <img
    //     src={imageData}
    //     alt={alt}
    //     className={className}
    //     width={width}
    //     height={height}
    //     ref={ref}
    //   />
    //   <figcaption
    //     contentEditable
    //     className="text-center italic mt-2"
    //     onInput={(e) => {
    //       // const caption = (e.target as HTMLElement).innerText;
    //       // updateAttributes({ caption, alt: caption });
    //     }}
    //     defaultValue={caption || alt || 'Add a caption'}
    //   >
    //   </figcaption>
    // </figure>
  },
);
