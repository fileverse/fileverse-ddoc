import { useEffect, useRef, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useEditingContext } from '../../hooks/use-editing-context';
import { debounce } from '../../utils/debounce';
import { LucideIcon } from '@fileverse/ui';

export const ActionButtonNodeView = ({
  node,
  editor,
  getPos,
}: NodeViewProps) => {
  const [inputValue, setInputValue] = useState<string>('');
  const isPreview = useEditingContext();
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
      alert('Please enter a url');
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
          inputValue
        ): {
            const matches = inputValue.match(
              /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/
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
          alert('Please enter a valid url');
          return;
        }
      }
    }

    const width = 640;
    const height = 360;

    const pos = getPos();
    const to = pos + node.nodeSize;

    formattedUrl &&
      editor
        ?.chain()
        .focus(pos)
        .deleteRange({ from: pos, to })
        .setIframe({ src: formattedUrl, width, height })
        .run();
  };

  const twitterRender = () => {
    if (!inputValue) {
      alert('Please enter a url');
      return;
    }

    let filteredTweetId = inputValue;

    const isValidUrl = twitterUrls.some((url) => inputValue.includes(url));
    const matches = inputValue.match(/\/status\/([0-9]*)/);
    const isValidTweetId = matches && matches.length > 0;

    if (isValidUrl && isValidTweetId) {
      filteredTweetId = matches[1];
    } else {
      alert('invalid url');
      return;
    }

    const pos = getPos();
    const to = pos + node.nodeSize;

    filteredTweetId &&
      editor
        ?.chain()
        .focus(pos)
        .deleteRange({ from: pos, to })
        .setTweetEmbed({ tweetId: filteredTweetId })
        .run();
  };

  const multiRender = () => {
    if (!inputValue) {
      alert('Please enter a URL');
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
        case /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/.test(inputValue): {
          const matches = inputValue.match(/youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/);
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
        case /(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/.test(inputValue): {
          const matches = inputValue.match(/(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/);
          if (matches && matches.length > 0) {
            formattedUrl = matches[3]; // Extract the tweet ID
            mediaType = 'twitter';
          }
          break;
        }
        default: {
          alert('Please enter a valid URL');
          return;
        }
      }
    }

    const width = 640;
    const height = 360;

    const pos = getPos();
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
  }

  const handleSave = () => {
    switch (node.attrs.data) {
      case 'twitter':
        twitterRender();
        break;
      case 'iframe':
        iframeRender();
        break
      default:
        multiRender();
        break;
    }
  };

  const debouncedHandleSave = debounce(handleSave, 500);

  useEffect(() => {
    const handleBackspace = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' && inputValue === '') {
        const pos = getPos();
        const to = pos + node.nodeSize;

        // Check if the node is actually empty or if it's just the input value that's empty
        if (node.content.size === 0 || node.textContent === '') {
          editor
            ?.chain()
            .focus(pos)
            .deleteRange({ from: pos, to })
            .run();
          event.preventDefault(); // Prevent the default backspace behavior
        }
      }
    };

    // Add the event listener
    document.addEventListener('keydown', handleBackspace);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('keydown', handleBackspace);
    };
  }, [inputValue, editor, getPos, node]);

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
    inputRef.current?.focus();
  }, []);

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      {!isPreview && (
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#A1AAB1]">
            {renderIcon()}
          </div>
          <input
            ref={inputRef}
            value={inputValue}
            placeholder={renderTitle()}
            onChange={(e) => setInputValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="rounded bg-[#f2f2f2] p-3 pl-10 w-full cursor-pointer transition-all ease-in-out text-sm"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
