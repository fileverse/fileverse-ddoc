/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor } from '@tiptap/core';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { debounce } from '../../utils/debounce';

export const Modal = ({
  editor,
  setShowModal,
  node,
}: {
  editor?: Editor;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  node: any;
}) => {
  const [inputValue, setInputValue] = useState('');

  const ref = useRef(null);

  const iframeRender = () => {
    if (!inputValue) {
      alert('please enter a url');
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
          alert('Please enter a valid url');
          return;
        }
      }
    }

    // get width and height from inputValue
    const widthMatches = inputValue.match(/width="([^"]*)"/);
    const heightMatches = inputValue.match(/height="([^"]*)"/);

    const width = widthMatches ? parseInt(widthMatches[1]) : 640;
    const height = heightMatches ? parseInt(heightMatches[1]) : 360;

    formattedUrl &&
      editor
        ?.chain()
        .focus()
        .setIframe({ src: formattedUrl, width, height })
        .run();
  };

  const twitterRender = () => {
    if (!inputValue) {
      alert('Please enter a url');
      return;
    }

    let filteredTweetId = inputValue;

    if (inputValue.includes('https://twitter.com')) {
      const matches = inputValue.match(/\/status\/([0-9]*)/);
      if (matches && matches.length > 0) {
        filteredTweetId = matches[1];
      } else {
        alert('Please enter a url');
        return;
      }
    } else {
      alert('Please enter a url');
      return;
    }

    filteredTweetId &&
      editor?.chain().focus().setTweetEmbed({ tweetId: filteredTweetId }).run();
  };

  const handleSave = () => {
    switch (node.attrs.data) {
      case 'twitter':
        twitterRender();
        break;
      default:
        iframeRender();
        break;
    }

    setShowModal(false);
  };

  const debouncedHandleSave = debounce(handleSave, 500); // Adjust the delay as needed

  useEffect(() => {
    if (inputValue) {
      debouncedHandleSave();
    }
  }, [inputValue]);

  return (
    <div
      ref={ref}
      className="iframe-input-modal z-50 h-auto absolute gap-2 top-[50px] items-center flex left-[50px] max-h-[330px] overflow-y-auto scroll-smooth rounded-md border border-stone-200 color-bg-default p-2 shadow-md"
    >
      <input
        value={inputValue}
        className="border-2 focus:border-black p-2 h-12 rounded-lg w-full font-medium"
        onChange={(e) => setInputValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Paste URL or embed here"
      />
      <div className="h-full flex items-center" contentEditable={false}>
        <button
          onClick={handleSave}
          className="w-auto p-[0.625rem] hover:bg-stone-100 h-12 border-[2px] border-black items-center rounded-md relative flex justify-center"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
