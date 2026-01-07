import { Button, LucideIcon } from '@fileverse/ui';
import { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useRef } from 'react';

interface EmbedSettingsProps {
  editor: Editor;
}

const TWITTER_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/;

export const EmbedSettings = ({ editor }: EmbedSettingsProps) => {
  const embedBtnRef = useRef<HTMLButtonElement>(null);
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
    if (e.key === 'Escape') {
      e.preventDefault();
      handleKeepAsUrl();
    }
  };

  const handleEmbedTweet = () => {
    if (typeof href === 'string') {
      const tweetId = href.match(TWITTER_REGEX)?.[2];
      if (!tweetId) return;
      const { selection } = editor.state;
      const { $from } = selection;
      console.log($from);
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
            embedBtnRef.current?.focus();
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
          ref={embedBtnRef}
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
