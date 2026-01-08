import { Button, LucideIcon } from '@fileverse/ui';
import { Editor, getMarkRange } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useRef } from 'react';
import { isTwitterUrl, TWITTER_REGEX } from '../../constants/twitter';

interface EmbedSettingsProps {
  editor: Editor;
}

export const EmbedSettings = ({ editor }: EmbedSettingsProps) => {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const shouldShow = ({ editor }: { editor: Editor }) => {
    // 1. Basic checks
    if (!editor.isActive('link')) return false;
    const href = editor.getAttributes('link').href;
    const passesTwitterUrlCheck = isTwitterUrl(
      editor.getAttributes('link').href,
    );
    if (!passesTwitterUrlCheck) return false;

    // 2. Advanced Check: Does the text content match the URL?
    const { state } = editor;
    const { selection } = state;

    // Get the range of the link mark at the current selection
    const range = getMarkRange(selection.$from, editor.schema.marks.link);
    if (!range) return false;

    // Extract the actual text seen by the user
    const linkText = state.doc.textBetween(range.from, range.to);

    // 3. Compare. We clean protocols to handle "twitter.com" vs "https://twitter.com" cases
    // Or just strictly check equality if you prefer strictly raw links.
    // This simple check works for most auto-linked content:
    return linkText === href;
  };

  const handleKeepAsUrl = (editor: Editor) => {
    const endPos = editor.state.selection.to;
    const href = editor.getAttributes('link').href;
    editor.commands.extendMarkRange('link', { href });
    editor
      .chain()
      .focus()
      .setTextSelection(endPos) // Jump to end of link
      .unsetMark('link') // Ensure next char isn't linked
      .insertContent(' ') // Insert the "namespace" space
      .run();
  };
  const handleKeyDown = (e: React.KeyboardEvent, editor: Editor) => {
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
      handleKeepAsUrl(editor);
    }
  };

  const handleEmbedTweet = (editor: Editor) => {
    const href = editor.getAttributes('link').href;
    if (typeof href === 'string') {
      const tweetId = href.match(TWITTER_REGEX)?.[2];
      if (!tweetId) return;
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
      <div
        className="flex flex-col gap-0.5"
        onKeyDown={(e) => handleKeyDown(e, editor)}
      >
        <p className="text-helper-sm text-xs color-text-secondary p-2">
          Paste as
        </p>
        <Button
          variant={'ghost'}
          className="text-body-sm justify-start px-2 py-[5px] gap-0 focus-visible:bg-[hsl(var(--color-button-secondary-hover))] focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus={true}
          onClick={() => handleEmbedTweet(editor)}
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
          onClick={() => handleKeepAsUrl(editor)}
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
