import { useEffect, useRef, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useEditingContext } from '../../hooks/use-editing-context';
import { debounce } from '../../utils/debounce';
import { LucideIcon, TextField } from '@fileverse/ui';

export const getActionButtonView =
  (onError?: (message: string) => void) =>
  ({ node, editor, getPos, deleteNode, ...props }: NodeViewProps) => {
    return (
      <ActionButtonNodeView
        node={node}
        editor={editor}
        deleteNode={deleteNode}
        onError={onError}
        getPos={getPos}
        {...props}
      />
    );
  };
// eslint-disable-next-line react-refresh/only-export-components
const ActionButtonNodeView = ({
  node,
  editor,
  getPos,
  deleteNode,
  onError,
}: NodeViewProps & { onError?: (message: string) => void }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const { isPreviewMode } = useEditingContext();
  const twitterUrls = ['https://twitter.com', 'https://x.com'];

  const renderIcon = () => {
    switch (node.attrs.data) {
      case 'twitter':
        return <LucideIcon name="XSocial" size={'md'} />;
      case 'iframe-video':
        return <LucideIcon name="Youtube" size={'md'} />;
      case 'iframe-soundcloud':
        // TODO: this needs to be turned to LucideIcon
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
          >
            <path
              d="M1.33301 16.4059C1.33301 16.6786 1.42898 16.8848 1.62089 17.0245C1.81282 17.1643 2.01798 17.2137 2.23637 17.1728C2.44153 17.1319 2.58547 17.0569 2.66822 16.9478C2.75094 16.8388 2.79231 16.6581 2.79231 16.4059V13.4408C2.79231 13.2295 2.72117 13.0505 2.57888 12.904C2.4366 12.7574 2.26288 12.6842 2.05771 12.6842C1.85916 12.6842 1.68876 12.7574 1.54646 12.904C1.40417 13.0505 1.33301 13.2295 1.33301 13.4408V16.4059ZM3.61624 17.6738C3.61624 17.8715 3.68408 18.0197 3.81975 18.1186C3.95543 18.2174 4.12915 18.2668 4.34092 18.2668C4.55931 18.2668 4.73633 18.2174 4.87202 18.1186C5.00768 18.0198 5.07552 17.8715 5.07552 17.6738V10.7619C5.07552 10.5575 5.00437 10.3819 4.86209 10.2354C4.7198 10.0888 4.54607 10.0155 4.34092 10.0155C4.14238 10.0155 3.97195 10.0888 3.82967 10.2354C3.68738 10.3819 3.61624 10.5575 3.61624 10.7619V17.6738ZM5.88955 18.001C5.88955 18.1987 5.95904 18.3469 6.09801 18.4458C6.23699 18.5446 6.41568 18.594 6.6341 18.594C6.84586 18.594 7.01959 18.5446 7.15525 18.4458C7.29093 18.3469 7.35878 18.1987 7.35878 18.001V11.6924C7.35878 11.4811 7.28762 11.3004 7.14534 11.1505C7.00305 11.0005 6.83264 10.9256 6.6341 10.9256C6.42892 10.9256 6.25355 11.0005 6.10796 11.1505C5.96237 11.3004 5.88957 11.4811 5.88957 11.6924L5.88955 18.001ZM8.17278 18.0317C8.17278 18.4066 8.41764 18.594 8.90738 18.594C9.39711 18.594 9.64197 18.4066 9.64197 18.0317V7.80703C9.64197 7.23445 9.47321 6.91067 9.13569 6.83568C8.91729 6.78115 8.70219 6.84591 8.49042 7.02995C8.27864 7.214 8.17276 7.47301 8.17276 7.80703V18.0317H8.17278ZM10.4957 18.3282V7.20377C10.4957 6.84932 10.5983 6.63802 10.8035 6.56984C11.2469 6.46079 11.687 6.40625 12.1238 6.40625C13.1363 6.40625 14.0794 6.65164 14.953 7.14242C15.8266 7.63321 16.5331 8.30292 17.0724 9.15156C17.6118 10.0002 17.9245 10.9358 18.0105 11.9582C18.4142 11.781 18.8444 11.6924 19.301 11.6924C20.2276 11.6924 21.0201 12.0298 21.6786 12.7046C22.3371 13.3795 22.6663 14.1906 22.6663 15.1381C22.6663 16.0924 22.3371 16.907 21.6786 17.5818C21.0201 18.2566 20.2309 18.5941 19.311 18.5941L10.6744 18.5838C10.6148 18.5634 10.5701 18.5259 10.5404 18.4714C10.5106 18.4168 10.4957 18.3691 10.4957 18.3282Z"
              fill="currentColor"
              stroke="transparent"
            />
          </svg>
        );
      default:
        return <LucideIcon name="Sparkles" size={'md'} />;
    }
  };

  const renderTitle = () => {
    switch (node.attrs.data) {
      case 'twitter':
        return 'Embed a Twitter tweet';
      case 'iframe-video':
        return 'Embed a video';
      case 'iframe-soundcloud':
        return 'Embed an audio';
      default:
        return 'Paste an Youtube or Twitter/X link to embed';
    }
  };

  const iframeRender = () => {
    if (!inputValue) {
      onError?.('Please enter a valid URL');
      return;
    }

    let formattedUrl = inputValue;

    if (inputValue.includes('<iframe')) {
      const matches = inputValue.match(/src="([^"]*)"/);
      if (matches && matches.length > 0) {
        formattedUrl = matches[1];
      }
    } else {
      switch (true) {
        case /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/.test(
          inputValue,
        ): {
          const matches = inputValue.match(
            /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
          );
          if (matches && matches.length > 0) {
            formattedUrl = `https://www.youtube.com/embed/${matches[1]}`;
          }
          break;
        }
        case /vimeo\.com\/([a-zA-Z0-9-_]+)/.test(inputValue): {
          const matches = inputValue.match(/vimeo\.com\/([a-zA-Z0-9-_]+)/);
          if (matches && matches.length > 0) {
            formattedUrl = `https://player.vimeo.com/video/${matches[1]}`;
          }
          break;
        }
        default: {
          onError?.('Please enter a valid URL');
          return;
        }
      }
    }

    const width = 640;
    const height = 360;

    const pos = getPos();

    if (pos !== undefined) {
      const to = pos + node.nodeSize;

      formattedUrl &&
        editor
          ?.chain()
          .focus(pos)
          .deleteRange({ from: pos, to })
          .setIframe({ src: formattedUrl, width, height })
          .run();
    } else {
      deleteNode();
    }
  };

  const twitterRender = () => {
    if (!inputValue) {
      onError?.('Please enter a valid URL');
      return;
    }

    let filteredTweetId = inputValue;

    const isValidUrl = twitterUrls.some((url) => inputValue.includes(url));
    const matches = inputValue.match(/\/status\/([0-9]*)/);
    const isValidTweetId = matches && matches.length > 0;

    if (isValidUrl && isValidTweetId) {
      filteredTweetId = matches[1];
    } else {
      onError?.('Please enter a valid post URL');
      return;
    }

    const pos = getPos();
    if (pos !== undefined) {
      const to = pos + node.nodeSize;
      filteredTweetId &&
        editor
          ?.chain()
          .focus(pos)
          .deleteRange({ from: pos, to })
          .setTweetEmbed({ tweetId: filteredTweetId })
          .run();
    } else {
      deleteNode();
    }
  };

  const soundcloudRender = () => {
    let sanitizedURL: string;
    const SOUNDCLOUD_REGEX =
      /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;
    if (!inputValue) {
      onError?.('Please enter a valid URL');
      return;
    }
    if (SOUNDCLOUD_REGEX.test(inputValue)) {
      const matches = inputValue.match(
        /(soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/,
      );
      if (matches && matches.length > 0) {
        const trackUrl = `https://${matches[1]}`;
        sanitizedURL = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          trackUrl,
        )}`;
        const width = 670;
        const height = 166;

        const pos = getPos();

        if (pos !== undefined) {
          const to = pos + node.nodeSize;

          sanitizedURL &&
            editor
              ?.chain()
              .focus(pos)
              .deleteRange({ from: pos, to })
              .setIframe({ src: sanitizedURL, width, height })
              .run();
        } else {
          deleteNode();
        }
      }
    } else {
      onError?.('Please enter a valid Soundcloud URL');
      return;
    }
  };

  const multiRender = () => {
    if (!inputValue) {
      onError?.('Please enter a valid URL');
      return;
    }

    let formattedUrl = inputValue;
    let mediaType = 'iframe';

    if (inputValue.includes('<iframe')) {
      const matches = inputValue.match(/src="([^"]*)"/);
      if (matches && matches.length > 0) {
        formattedUrl = matches[1];
      }
    } else {
      switch (true) {
        case /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/.test(
          inputValue,
        ): {
          const matches = inputValue.match(
            /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
          );
          if (matches && matches.length > 0) {
            formattedUrl = `https://www.youtube.com/embed/${matches[1]}`;
          }
          break;
        }
        case /vimeo\.com\/([a-zA-Z0-9-_]+)/.test(inputValue): {
          const matches = inputValue.match(/vimeo\.com\/([a-zA-Z0-9-_]+)/);
          if (matches && matches.length > 0) {
            formattedUrl = `https://player.vimeo.com/video/${matches[1]}`;
          }
          break;
        }
        case /(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/.test(
          inputValue,
        ): {
          const matches = inputValue.match(
            /(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/,
          );
          if (matches && matches.length > 0) {
            formattedUrl = matches[3]; // Extract the tweet ID
            mediaType = 'twitter';
          }
          break;
        }
        default: {
          onError?.('Please enter a valid URL');
          return;
        }
      }
    }

    const width = 640;
    const height = 360;

    const pos = getPos();
    if (pos !== undefined) {
      const to = pos + node.nodeSize;
      if (formattedUrl) {
        const chain = editor?.chain().focus(pos).deleteRange({ from: pos, to });
        if (mediaType === 'twitter') {
          chain?.setTweetEmbed({ tweetId: formattedUrl });
        } else {
          chain?.setIframe({ src: formattedUrl, width, height });
        }
        chain?.run();
      }
    } else {
      deleteNode();
    }
  };

  const handleSave = () => {
    switch (node.attrs.data) {
      case 'twitter':
        twitterRender();
        break;
      case 'iframe-video':
        iframeRender();
        break;
      case 'iframe-soundcloud':
        soundcloudRender();
        break;
      default:
        multiRender();
        break;
    }
  };

  const debouncedHandleSave = debounce(handleSave, 1000);

  useEffect(() => {
    if (inputValue) {
      debouncedHandleSave();
    }
  }, [inputValue]);

  useEffect(() => {
    editor?.chain().focus();
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array means this runs once on mount

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      {!isPreviewMode && (
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none color-text-default">
            {renderIcon()}
          </div>
          <TextField
            ref={inputRef}
            value={inputValue}
            placeholder={renderTitle()}
            onChange={(e) => setInputValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="p-3 pl-10 w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && inputValue === '') {
                deleteNode();
              }
            }}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
