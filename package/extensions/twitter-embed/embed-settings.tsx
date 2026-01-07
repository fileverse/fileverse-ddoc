import { Button, LucideIcon } from '@fileverse/ui';
import { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useRef } from 'react';

interface EmbedSettingsProps {
  editor: Editor;
}

export const TWITTER_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/;

export const EmbedSettings = ({ editor }: EmbedSettingsProps) => {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const href = editor.getAttributes('link').href;
  const isTwitterUrl = (url: string | null | undefined) => {
    if (!url) return false;
    return !!url.match(TWITTER_REGEX);
  };

  const shouldShow = ({ editor }: { editor: Editor }) => {
    return (
      editor.isActive('link') && isTwitterUrl(editor.getAttributes('link').href)
    );
  };

  const handleKeepAsUrl = () => {
    const endPos = editor.state.selection.to;
    editor.commands.extendMarkRange('link', { href });
    editor
      .chain()
      .focus()
      .setTextSelection(endPos) // Jump to end of link
      .unsetMark('link') // Ensure next char isn't linked
      .insertContent(' ') // Insert the "namespace" space
      .run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { key } = e;
    const currentIndex = 0;
    let index = 0;
    if (key === 'ArrowDown') {
      e.preventDefault();
      index = currentIndex >= btnRefs.current.length - 1 ? 0 : currentIndex + 1;
      btnRefs.current[index]?.focus();
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      index = (index - 1) % 1;
      btnRefs.current[index]?.focus();
    }
    if (key === 'Escape') {
      e.preventDefault();
      handleKeepAsUrl();
    }
  };

  const handleEmbedTweet = () => {
    console.log('1', href);
    if (typeof href === 'string') {
      const tweetId = href.match(TWITTER_REGEX)?.[2];
      console.log('2', tweetId);
      if (!tweetId) return;
      console.log('3');
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .deleteSelection()
        .setTweetEmbed({ tweetId: tweetId })
        .run();
    } else return;
  };
  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'bottom',
        onShow: () => {
          setTimeout(() => {
            btnRefs.current[0]?.focus();
          }, 50);
        },
      }}
      shouldShow={shouldShow}
      className="p-2 border color-border-default shadow-elevation-3 color-bg-default rounded-lg"
    >
      <div className="flex flex-col gap-0.5" onKeyDown={handleKeyDown}>
        <p className="text-helper-sm text-xs color-text-secondary p-2">
          Paste as
        </p>
        <Button
          variant={'ghost'}
          className="text-body-sm justify-start px-2 py-[5px] gap-0 focus-visible:bg-[hsl(var(--color-button-secondary-hover))] focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus={true}
          onClick={handleEmbedTweet}
          ref={(el) => (btnRefs.current[0] = el)}
        >
          <LucideIcon name={'GalleryVertical'} className="size-4 mr-2" />
          <span className="mr-4">Embed Tweet</span>
          <span className="text-helper-sm text-xs color-text-secondary ml-auto">
            ⮐
          </span>
        </Button>
        <Button
          variant={'ghost'}
          className="text-body-sm justify-start px-2 py-[5px] gap-0 focus-visible:bg-[hsl(var(--color-button-secondary-hover))] focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={handleKeepAsUrl}
          ref={(el) => (btnRefs.current[1] = el)}
        >
          <LucideIcon name={'Link'} className="size-4 mr-2" />
          <span className="mr-4">URL</span>
          <span className="text-helper-sm text-xs color-text-secondary ml-auto">
            Esc
          </span>
        </Button>
      </div>
    </BubbleMenu>
  );
};
