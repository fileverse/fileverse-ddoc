import { useEffect, useRef, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useEditingContext } from '../../hooks/use-editing-context';
import { debounce } from '../../utils/debounce';
import { LucideIcon, TextField, toast } from '@fileverse/ui';

export const ActionButtonNodeView = ({
  node,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) => {
  const [inputValue, setInputValue] = useState<string>('');
  const { isPreviewMode } = useEditingContext();
  const twitterUrls = ['https://twitter.com', 'https://x.com'];

  const renderIcon = () => {
    switch (node.attrs.data) {
      case 'twitter':
        return <LucideIcon name="XSocial" size={'md'} />;
      case 'iframe':
        return <LucideIcon name="Youtube" size={'md'} />;
      default:
        return <LucideIcon name="Sparkles" size={'md'} />;
    }
  };

  const renderTitle = () => {
    switch (node.attrs.data) {
      case 'twitter':
        return 'Embed a Twitter tweet';
      case 'iframe':
        return 'Embed a video';
      default:
        return 'Paste an Youtube or Twitter/X link to embed';
    }
  };

  const iframeRender = () => {
    if (!inputValue) {
      toast({
        title: 'Please enter a valid URL',
        variant: 'secondary',
      });
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
          toast({
            title: 'Please enter a valid URL',
            variant: 'secondary',
          });
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
      toast({
        title: 'Please enter a valid URL',
        variant: 'secondary',
      });
      return;
    }

    let filteredTweetId = inputValue;

    const isValidUrl = twitterUrls.some((url) => inputValue.includes(url));
    const matches = inputValue.match(/\/status\/([0-9]*)/);
    const isValidTweetId = matches && matches.length > 0;

    if (isValidUrl && isValidTweetId) {
      filteredTweetId = matches[1];
    } else {
      toast({
        title: 'Please enter a valid URL',
        variant: 'secondary',
      });
      return;
    }

    const pos = getPos() ?? 0;
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

  const multiRender = () => {
    if (!inputValue) {
      toast({
        title: 'Please enter a valid URL',
        variant: 'secondary',
      });
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
          toast({
            title: 'Please enter a valid URL',
            variant: 'secondary',
          });
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
      case 'iframe':
        iframeRender();
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
