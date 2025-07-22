import { useState, useEffect, forwardRef } from 'react';
import { Skeleton } from '@fileverse/ui';
import { IpfsImageFetchPayload } from '../types.ts';

type Props = {
  encryptionKey: string;
  url: string;
  nonce: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
  caption?: string;
  ipfsImageFetchFn: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>;
  ipfsHash: string;
  mimeType: string;
  authTag: string;
};

export const SecureImageV2 = forwardRef<HTMLImageElement, Props>(
  (
    {
      encryptionKey,
      url,
      nonce,
      alt,
      className,
      width,
      height,
      ipfsImageFetchFn,
      ipfsHash,
      mimeType,
      authTag,
    },
    ref,
  ) => {
    const [source, setSource] = useState<string>('');

    useEffect(() => {
      const imageReadyForDecryption = encryptionKey && url && nonce && authTag;
      let isMounted = true;
      let currentObjectUrl: string | null = null;
      if (imageReadyForDecryption) {
        const handleImage = async () => {
          try {
            const result = await ipfsImageFetchFn({
              encryptionKey,
              ipfsUrl: url,
              nonce,
              ipfsHash,
              mimeType,
              authTag,
            });
            currentObjectUrl = result.url;
            // add check before setting state
            // in order to prevent react errors / warning that occurs when you set state when component is unmounting
            if (isMounted) {
              setSource(currentObjectUrl);
            }
          } catch (error) {
            console.log({ error });
          }
        };

        handleImage();
      }

      return () => {
        isMounted = false;
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
        }
      };
    }, [encryptionKey, url, nonce, authTag]);

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
  },
);
