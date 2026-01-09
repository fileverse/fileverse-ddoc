import { Button, LucideIcon } from '@fileverse/ui';
import { Editor, getMarkRange } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useCallback, useRef } from 'react';
import { isTwitterUrl, TWITTER_REGEX } from '../../constants/twitter';

interface EmbedSettingsProps {
  editor: Editor;
}

export const EmbedSettings = ({ editor }: EmbedSettingsProps) => {
  const showRef = useRef(true);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const embedRef = useRef<HTMLDivElement>(null);

  const shouldShow = ({ editor }: { editor: Editor }) => {
    // 1. Basic checks
    if (!showRef.current) return false;
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

    // 3. Compare.
    return linkText === href;
  };

  const handleKeepAsUrl = useCallback(() => {
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
  }, [editor]);

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (embedRef.current && embedRef.current.contains(e.target as Node))
        return;
      handleKeepAsUrl();
    },
    [handleKeepAsUrl],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { key } = e;
      // Get the currently focused button index. This assumes focus is within btnRefs.
      // If no button is focused or focus is elsewhere, it defaults to 0.
      const currentlyFocusedElement = document.activeElement;
      let currentIndex = btnRefs.current.findIndex(
        (btn) => btn === currentlyFocusedElement,
      );
      if (currentIndex === -1) currentIndex = 0; // Default to first button if none is focused

      let nextIndex = currentIndex;

      if (key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % btnRefs.current.length;
        btnRefs.current[nextIndex]?.focus();
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        // Correct calculation for wrapping around upwards
        nextIndex =
          (currentIndex - 1 + btnRefs.current.length) % btnRefs.current.length;
        btnRefs.current[nextIndex]?.focus();
      }
      if (key === 'Escape') {
        e.preventDefault();
        handleKeepAsUrl();
      }
    },
    [btnRefs, handleKeepAsUrl], // Dependencies for useCallback
  );

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
          document.addEventListener('keydown', handleKeyDown);
          document.addEventListener('mousedown', handleOutsideClick);
          setTimeout(() => {
            btnRefs.current[0]?.focus();
          }, 50);
          showRef.current = false;
        },
        onHide: () => {
          document.removeEventListener('keydown', handleKeyDown);
          document.removeEventListener('mousedown', handleOutsideClick);
          showRef.current = true;
        },
        hide: !showRef.current,
      }}
      shouldShow={shouldShow}
      className="p-2 border color-border-default shadow-elevation-3 color-bg-default rounded-lg"
    >
      <div className="flex flex-col gap-0.5" ref={embedRef}>
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
