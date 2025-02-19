import {
  cn,
  EmojiClickData,
  EmojiPicker,
  EmojiStyle,
  IconButton,
} from '@fileverse/ui';
import { useComments } from './context/comment-context';
import { useRef, useState } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import { createPortal } from 'react-dom';
import React from 'react';

interface CommentReactionsProps {
  commentId: string;
  isDropdown: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const CommentReactions = ({
  commentId,
  isDropdown,
}: CommentReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const { handleAddReaction } = useComments();
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onEmojiSelect = (emoji: EmojiClickData) => {
    handleAddReaction(commentId, emoji);
    setShowPicker(false);
  };

  useOnClickOutside(pickerRef, () => setShowPicker(false));

  if (isDropdown) {
    const handleShowPicker = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: rect.left - 250,
        });
        setShowPicker(true);
      }
    };

    return (
      <React.Fragment>
        <IconButton
          ref={buttonRef}
          variant="ghost"
          icon="Smile"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={handleShowPicker}
        />
        {showPicker &&
          createPortal(
            <div
              ref={pickerRef}
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 51,
              }}
              className={cn(
                'border color-border-default shadow-elevation-4 rounded-lg',
              )}
            >
              <EmojiPicker
                reactionsDefaultOpen={true}
                previewConfig={{
                  showPreview: false,
                }}
                height={280}
                width={280}
                className="!border-none !rounded-lg overflow-auto !bg-[#FFFFFF]"
                emojiStyle={EmojiStyle.NATIVE}
                onEmojiClick={onEmojiSelect}
                open={showPicker}
                lazyLoadEmojis={false}
                autoFocusSearch={false}
              />
            </div>,
            document.getElementById('editor-canvas') || document.body,
          )}
      </React.Fragment>
    );
  }

  return (
    <div className="relative">
      <IconButton
        variant="ghost"
        icon="Smile"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        onClick={() => setShowPicker(!showPicker)}
      />
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-50 top-full left-full -translate-x-[92%] mt-3 border color-border-default shadow-elevation-4 rounded-lg"
        >
          <EmojiPicker
            reactionsDefaultOpen={true}
            previewConfig={{
              showPreview: false,
            }}
            height={316}
            width={320}
            className="!border-none !rounded-lg overflow-auto bg-[#FFFFFF]"
            emojiStyle={EmojiStyle.NATIVE}
            onEmojiClick={onEmojiSelect}
            open={showPicker}
            lazyLoadEmojis={false}
            autoFocusSearch={false}
          />
        </div>
      )}
    </div>
  );
};
