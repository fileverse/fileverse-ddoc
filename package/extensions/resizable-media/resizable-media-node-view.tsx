/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { LegacyRef, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { resizableMediaActions } from './resizable-media-menu-util';
import cn from 'classnames';
import { useEditingContext } from '../../hooks/use-editing-context';
import ToolbarButton from '../../common/toolbar-button';
import { SecureImage } from '../../components/secure-image.tsx';
import { SecureImageV2 } from '../../components/secure-image-v2.tsx';
import { IpfsImageFetchPayload } from '../../types.ts';

let lastClientX: number;
interface WidthAndHeight {
  width: number;
  height: number;
}

export const getResizableMediaNodeView =
  (
    ipfsImageFetchFn: (
      _data: IpfsImageFetchPayload,
    ) => Promise<{ url: string; file: File }>,
  ) =>
  ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
    const { isPreviewMode } = useEditingContext();

    const [mediaType, setMediaType] = useState<
      'img' | 'secure-img' | 'video' | 'iframe'
    >();

    const [aspectRatio, setAspectRatio] = useState(0);

    const [proseMirrorContainerWidth, setProseMirrorContainerWidth] =
      useState(0);

    const [mediaActionActiveState, setMediaActionActiveState] = useState<
      Record<string, boolean>
    >({});

    const resizableImgRef = useRef<
      HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | null
    >(null);

    const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

    const [isDragging, setIsDragging] = useState(false);
    const [touchTimeout, setTouchTimeout] = useState<ReturnType<
      typeof setTimeout
    > | null>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    const calculateMediaActionActiveStates = () => {
      const activeStates: Record<string, boolean> = {};

      resizableMediaActions.forEach(({ tooltip, isActive }) => {
        activeStates[tooltip] = !!isActive?.(node.attrs);
      });

      setMediaActionActiveState(activeStates);
    };

    const mediaSetupOnLoad = () => {
      // ! TODO: move this to extension storage
      const proseMirrorContainerDiv = document.querySelector('.ProseMirror');

      if (proseMirrorContainerDiv)
        setProseMirrorContainerWidth(proseMirrorContainerDiv?.clientWidth);

      // When the media has loaded
      if (!resizableImgRef.current) return;

      if (mediaType === 'video') {
        const video = resizableImgRef.current as HTMLVideoElement;

        video.addEventListener('loadeddata', function () {
          // Aspect Ratio from its original size
          setAspectRatio(video.videoWidth / video.videoHeight);

          // for the first time when video is added with custom width and height
          // and we have to adjust the video height according to it's width
          onHorizontalResize('left', 0);
        });
      } else if (mediaType === 'iframe') {
        const iframe = resizableImgRef.current as HTMLIFrameElement;

        iframe.onload = () => {
          // Aspect Ratio from its original size
          setAspectRatio(iframe.offsetWidth / iframe.offsetHeight);

          onHorizontalResize('left', 0);
        };
      } else {
        resizableImgRef.current.onload = () => {
          // Aspect Ratio from its original size
          setAspectRatio(
            (resizableImgRef.current as HTMLImageElement).naturalWidth /
              (resizableImgRef.current as HTMLImageElement).naturalHeight,
          );
        };
      }

      setTimeout(() => calculateMediaActionActiveStates(), 200);
    };

    const setLastClientX = (x: number) => {
      lastClientX = x;
    };

    useEffect(() => {
      mediaSetupOnLoad();
    }, []);

    const limitWidthOrHeight = ({ width, height }: WidthAndHeight) =>
      width < 200 || height < 200;

    const documentHorizontalMouseMove = (e: MouseEvent | TouchEvent) => {
      // Determine if the event is a touch event and extract clientX accordingly
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      setTimeout(() => onHorizontalMouseMove(clientX));
    };

    const startHorizontalResize = (e: MouseEvent | TouchEvent) => {
      e.stopPropagation();
      // Check if it's a touch event and extract the clientX accordingly
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      lastClientX = clientX;

      setTimeout(() => {
        // Use both mouse and touch events for move and end actions
        document.addEventListener('mousemove', documentHorizontalMouseMove);
        document.addEventListener('mouseup', stopHorizontalResize);
        document.addEventListener('touchmove', documentHorizontalMouseMove);
        document.addEventListener('touchend', stopHorizontalResize);
      });

      setIsMouseDown(true);
    };

    const stopHorizontalResize = () => {
      lastClientX = -1;

      document.removeEventListener('mousemove', documentHorizontalMouseMove);
      document.removeEventListener('mouseup', stopHorizontalResize);

      setIsMouseDown(false);
    };

    const onHorizontalResize = (
      directionOfMouseMove: 'right' | 'left',
      diff: number,
    ) => {
      if (!resizableImgRef.current) {
        console.error('Media ref is undefined|null', {
          resizableImg: resizableImgRef.current,
        });
        return;
      }

      const currentMediaDimensions: WidthAndHeight = {
        width: resizableImgRef.current?.width as number,
        height: resizableImgRef.current?.height as number,
      };

      const newMediaDimensions: WidthAndHeight = {
        width: -1,
        height: -1,
      };

      // Ensure currentMediaDimensions.width is a number
      let width = parseFloat(currentMediaDimensions.width.toString());
      if (isNaN(width)) {
        width = 0; // Default width if current width is not a number
      }

      if (directionOfMouseMove === 'left') {
        newMediaDimensions.width = width - Math.abs(diff);
      } else {
        newMediaDimensions.width = width + Math.abs(diff);
      }

      // Ensure width does not exceed container width
      if (newMediaDimensions.width > proseMirrorContainerWidth) {
        newMediaDimensions.width = proseMirrorContainerWidth;
      }

      // Calculate height based on media type and aspect ratio
      if (mediaType === 'iframe') {
        // Protect against division by zero or undefined aspectRatio
        newMediaDimensions.height = newMediaDimensions.width / (16 / 9);
      } else {
        // Ensure aspectRatio is a valid number
        const validAspectRatio = isNaN(aspectRatio) ? 1 : aspectRatio; // Fallback to 1 if aspectRatio is NaN
        newMediaDimensions.height = newMediaDimensions.width / validAspectRatio;
      }

      // Fallback for NaN dimensions
      newMediaDimensions.width = isNaN(newMediaDimensions.width)
        ? 0
        : newMediaDimensions.width;
      newMediaDimensions.height = isNaN(newMediaDimensions.height)
        ? 0
        : newMediaDimensions.height;

      if (limitWidthOrHeight(newMediaDimensions)) return;

      updateAttributes(newMediaDimensions);
    };

    const onHorizontalMouseMove = (clientX: number) => {
      if (lastClientX === -1) return;

      const diff = lastClientX - clientX;

      if (diff === 0) return;

      const directionOfMouseMove: 'left' | 'right' =
        diff > 0 ? 'left' : 'right';

      setTimeout(() => {
        onHorizontalResize(directionOfMouseMove, Math.abs(diff));
        lastClientX = clientX;
      });
    };

    const [isFloat, setIsFloat] = useState<boolean>();

    const [isAlign, setIsAlign] = useState<boolean>();

    useEffect(() => {
      setMediaType(node.attrs['media-type']);
      calculateMediaActionActiveStates();
      setIsFloat(node.attrs.dataFloat);
      setIsAlign(node.attrs.dataAlign);
    }, [node.attrs]);

    const handleTouchStart = (e: React.TouchEvent) => {
      // Prevent default to avoid scrolling while attempting to drag
      e.stopPropagation();

      // Store initial touch position
      dragStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      // Set a timeout to distinguish between tap and drag
      const timeout = setTimeout(() => {
        setIsDragging(true);
      }, 500); // 500ms hold to start drag

      setTouchTimeout(timeout);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) {
        // If we moved before the drag started, cancel the timeout
        if (touchTimeout) {
          clearTimeout(touchTimeout);
          setTouchTimeout(null);
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchEnd = () => {
      if (touchTimeout) {
        clearTimeout(touchTimeout);
        setTouchTimeout(null);
      }
      setIsDragging(false);
      dragStartPos.current = null;
    };

    useEffect(() => {
      return () => {
        if (touchTimeout) {
          clearTimeout(touchTimeout);
        }
      };
    }, [touchTimeout]);

    console.log(node.attrs, 'node.attrs');

    return (
      <NodeViewWrapper
        as="article"
        className={cn(
          'media-node-view not-prose transition-all ease-in-out w-full',
          isFloat && `f-${node.attrs.dataFloat}`,
          isAlign && `justify-${node.attrs.dataAlign}`,
        )}
      >
        <div
          draggable={isDragging}
          data-drag-handle={isDragging}
          className={cn(
            'w-fit flex flex-col relative group transition-all ease-in-out',
            isDragging && 'opacity-50',
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className={cn(
              'relative',
              node.attrs.dataAlign === 'start' && 'self-start',
              node.attrs.dataAlign === 'center' && 'self-center',
              node.attrs.dataAlign === 'end' && 'self-end',
            )}
          >
            {mediaType === 'img' && (
              <img
                src={node.attrs.src}
                ref={resizableImgRef as LegacyRef<HTMLImageElement>}
                className="rounded-lg"
                alt={node.attrs.src}
                width={node.attrs.width}
                height={node.attrs.height}
              />
            )}

            {mediaType === 'secure-img' && node.attrs.version !== '2' && (
              <SecureImage
                encryptedKey={node.attrs.encryptedKey}
                url={node.attrs.url}
                iv={node.attrs.iv}
                privateKey={node.attrs.privateKey}
                alt={node.attrs.alt}
                // caption={node.attrs.caption}
                className="rounded-lg"
                width={node.attrs.width}
                height={node.attrs.height}
                ref={resizableImgRef as LegacyRef<HTMLImageElement>}
              />
            )}

            {mediaType === 'secure-img' && node.attrs.version === '2' && (
              <SecureImageV2
                encryptionKey={node.attrs.encryptionKey}
                url={node.attrs.ipfsUrl}
                nonce={node.attrs.nonce}
                ipfsHash={node.attrs.ipfsHash}
                alt={node.attrs.alt}
                ipfsImageFetchFn={ipfsImageFetchFn}
                className="rounded-lg"
                width={node.attrs.width}
                height={node.attrs.height}
                mimeType={node.attrs.mimeType}
                ref={resizableImgRef as LegacyRef<HTMLImageElement>}
              />
            )}

            {mediaType === 'video' && (
              <video
                ref={resizableImgRef as LegacyRef<HTMLVideoElement>}
                className="rounded-lg"
                controls
                width={node.attrs.width}
                height={node.attrs.height}
              >
                <source src={node.attrs.src} />
              </video>
            )}

            {mediaType === 'iframe' && (
              <iframe
                ref={resizableImgRef as LegacyRef<HTMLIFrameElement>}
                className={cn(
                  'rounded-lg max-w-full',
                  isMouseDown && 'pointer-events-none',
                )}
                src={node.attrs.src}
                width={node.attrs.width}
                height={node.attrs.height}
              />
            )}

            {!isPreviewMode && (
              <div
                className="horizontal-resize-handle group-hover:bg-[#2E2E2E] group-hover:border-2 group-hover:border-[#E8EBEC]"
                title="Resize"
                onClick={({ clientX }) => setLastClientX(clientX)}
                onMouseDown={(e: any) => startHorizontalResize(e)}
                onMouseUp={stopHorizontalResize}
                onTouchStart={(e: any) => startHorizontalResize(e)}
                onTouchEnd={stopHorizontalResize}
              />
            )}
          </div>

          {node.attrs.showCaptionInput && (
            <div className="caption-input-container">
              <textarea
                placeholder="Add a caption"
                value={node.attrs.caption || ''}
                onChange={(e) => {
                  let newValue = e.target.value;
                  if (newValue.length > 300) {
                    newValue = newValue.substring(0, 300);
                  }
                  updateAttributes({ caption: newValue });

                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onPaste={(e: React.ClipboardEvent<HTMLTextAreaElement>) => {
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text');
                  const currentText = e.currentTarget.value;
                  const newText = (currentText + paste).substring(0, 300);
                  updateAttributes({ caption: newText });

                  const target = e.currentTarget;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onBlur={() => {
                  if (!node.attrs.caption) {
                    updateAttributes({ showCaptionInput: false });
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onFocus={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.fontSize = '16px';
                }}
                autoFocus
                className={cn(
                  'bg-transparent color-text-secondary dark:!text-[#888888] resize-none !mt-2',
                  'placeholder-disabled',
                  {
                    'text-left': node.attrs.dataAlign === 'start',
                    'text-center': node.attrs.dataAlign === 'center',
                    'text-right': node.attrs.dataAlign === 'end',
                  },
                )}
              />
            </div>
          )}

          {node.attrs.caption && !node.attrs.showCaptionInput && (
            <div className="caption">{node.attrs.caption}</div>
          )}

          {!isPreviewMode && (
            <span className="absolute top-2 right-2 transition-all rounded-md overflow-hidden box-border border color-border-default color-bg-default shadow-elevation-3 opacity-0 group-hover:opacity-100 flex gap-1 p-1">
              {resizableMediaActions.map((btn, index) => {
                return (
                  <ToolbarButton
                    key={index}
                    tooltip={btn.tooltip}
                    isActive={mediaActionActiveState[btn.tooltip]}
                    onClick={() =>
                      btn.tooltip === 'Delete'
                        ? deleteNode()
                        : btn.action?.(updateAttributes)
                    }
                    icon={btn.icon as string}
                    classNames="min-w-6 aspect-square"
                    size="sm"
                  />
                );
              })}
            </span>
          )}
        </div>
      </NodeViewWrapper>
    );
  };
