/* eslint-disable react-hooks/exhaustive-deps */
import { LegacyRef, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { resizableMediaActions } from './resizable-media-menu-util';
import clx from 'classnames';
import { useEditingContext } from '../../hooks/use-editing-context';

let lastClientX: number;
interface WidthAndHeight {
  width: number;
  height: number;
}
export const ResizableMediaNodeView = ({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) => {
  const isPreview = useEditingContext();

  const [mediaType, setMediaType] = useState<'img' | 'video' | 'iframe'>();

  const [aspectRatio, setAspectRatio] = useState(0);

  const [proseMirrorContainerWidth, setProseMirrorContainerWidth] = useState(0);

  const [mediaActionActiveState, setMediaActionActiveState] = useState<
    Record<string, boolean>
  >({});

  const resizableImgRef = useRef<
    HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | null
  >(null);

  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

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
            (resizableImgRef.current as HTMLImageElement).naturalHeight
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

  const documentHorizontalMouseMove = (e: MouseEvent) => {
    setTimeout(() => onHorizontalMouseMove(e));
  };

  const startHorizontalResize = (e: { clientX: number }) => {
    lastClientX = e.clientX;

    setTimeout(() => {
      document.addEventListener('mousemove', documentHorizontalMouseMove);
      document.addEventListener('mouseup', stopHorizontalResize);
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
    diff: number
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

    if (directionOfMouseMove === 'left') {
      newMediaDimensions.width = currentMediaDimensions.width - Math.abs(diff);
    } else {
      if (typeof currentMediaDimensions.width === 'string') {
        currentMediaDimensions.width = Number(currentMediaDimensions.width);
      }
      newMediaDimensions.width = currentMediaDimensions.width + Math.abs(diff);
    }

    if (newMediaDimensions.width > proseMirrorContainerWidth)
      newMediaDimensions.width = proseMirrorContainerWidth;

    if (mediaType === 'iframe') {
      // calculate height from width and aspect ratio for iframe, which should be 16/9
      newMediaDimensions.height = newMediaDimensions.width / (16 / 9);
    } else {
      newMediaDimensions.height = newMediaDimensions.width / aspectRatio;
    }

    if (limitWidthOrHeight(newMediaDimensions)) return;

    updateAttributes(newMediaDimensions);
  };

  const onHorizontalMouseMove = (e: MouseEvent) => {
    if (lastClientX === -1) return;

    const { clientX } = e;

    const diff = lastClientX - clientX;

    if (diff === 0) return;

    const directionOfMouseMove: 'left' | 'right' = diff > 0 ? 'left' : 'right';

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

  return (
    <NodeViewWrapper
      as="article"
      className={clx(
        'media-node-view not-prose transition-all ease-in-out w-full',
        isFloat && `f-${node.attrs.dataFloat}`,
        isAlign && `justify-${node.attrs.dataAlign}`
      )}
    >
      <div className="w-fit flex relative group transition-all ease-in-out">
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
            className={clx(
              'rounded-lg max-w-full',
              isMouseDown && 'pointer-events-none'
            )}
            src={node.attrs.src}
            width={node.attrs.width}
            height={node.attrs.height}
          />
        )}

        {!isPreview && (
          <>
            <div
              className="horizontal-resize-handle group-hover:bg-black group-hover:border-2 group-hover:border-white/80"
              title="Resize"
              onClick={({ clientX }) => setLastClientX(clientX)}
              onMouseDown={startHorizontalResize}
              onMouseUp={stopHorizontalResize}
            />

            <section className="media-control-buttons opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {resizableMediaActions.map((btn) => {
                return (
                  <div className="tooltip" data-tip={btn.tooltip}>
                    <button
                      type="button"
                      className={clx(
                        'btn rounded-none h-8 px-2',
                        mediaActionActiveState[btn.tooltip] && 'active'
                      )}
                      onClick={() =>
                        btn.tooltip === 'Delete'
                          ? deleteNode()
                          : btn.action?.(updateAttributes)
                      }
                    >
                      <img src={btn.icon} className="w-4" />
                    </button>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};
