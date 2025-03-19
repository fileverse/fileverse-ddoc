import { useEffect, useRef, useState } from 'react';

export interface LinkPreviewData {
  image: string;
  title: string;
  description: string;
  favicon: string;
  link: string;
}

export const LinkPreviewCard = ({
  link,
  metadataProxyUrl,
}: {
  link: string;
  metadataProxyUrl: string;
}) => {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const metadataCache = useRef(new Map<string, LinkPreviewData>());

  useEffect(() => {
    if (!link) return;
    setLoading(true);
    if (metadataCache.current.has(link)) {
      setPreviewData(metadataCache.current.get(link)!);
      setLoading(false);
      return;
    }

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${metadataProxyUrl}/${encodeURIComponent(link)}`,
        );
        const { metadata } = await response.json();

        const newPreviewData: LinkPreviewData = {
          title: metadata.title,
          description: metadata.description,
          image: metadata.image,
          favicon: metadata.favicon,
          link: link,
        };

        metadataCache.current.set(link, newPreviewData);
        setPreviewData(newPreviewData);
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching link preview:', error);
        setPreviewData(null);
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [link]);

  return (
    <div className="w-[250px] border color-border-default shadow-elevation-3 rounded p-3 flex flex-col gap-2 justify-center hover-link-popup color-bg-default">
      {loading ? (
        <p className="text-helper-text-sm color-text-secondary">
          Loading preview...
        </p>
      ) : previewData ? (
        <>
          {previewData.image && (
            <img
              src={previewData.image}
              className="w-[225px] h-[125px] object-contain rounded"
              alt="Preview"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex flex-col gap-2">
            {(previewData.title || previewData.description) && (
              <div className="flex flex-col gap-[2px]">
                {previewData.title && (
                  <p className="text-heading-xsm w-full truncate color-text-default select-text">
                    {previewData.title}
                  </p>
                )}
                {previewData.description && (
                  <p className="text-helper-text-sm color-text-secondary w-full truncate select-text">
                    {previewData.description}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {previewData.favicon && (
                <img
                  src={previewData.favicon}
                  className="w-[18px] aspect-square rounded"
                  alt="Favicon"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {previewData.link && (
                <a
                  href={previewData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-helper-text-sm color-text-link w-full truncate hover:underline hover:cursor-pointer"
                >
                  {previewData.link}
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-helper-text-sm color-text-secondary">
          No preview available
        </p>
      )}
    </div>
  );
};
