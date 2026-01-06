import { Button, LucideIcon } from '@fileverse/ui';
import { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';

interface EmbedSettingsProps {
  editor: Editor;
}

const TWITTER_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/;

export const EmbedSettings = ({ editor }: EmbedSettingsProps) => {
  const isTwitterUrl = (url: string | null | undefined) => {
    if (!url) return false;
    return !!url.match(TWITTER_REGEX);
  };

  const shouldShow = ({ editor }: { editor: Editor }) => {
    return (
      editor.isActive('link') && isTwitterUrl(editor.getAttributes('link').href)
    );
  };

  const handleEmbedTweet = () => {
    const href = editor.getAttributes('link').href;
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
      options={{ placement: 'bottom' }}
      shouldShow={shouldShow}
      className="p-2 border color-border-default shadow-elevation-3 color-bg-default rounded-lg"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-helper-sm text-xs color-text-secondary p-2">
          Paste as
        </p>
        <Button
          variant={'ghost'}
          className="text-body-sm justify-start px-2 py-[5px] gap-0"
          onClick={handleEmbedTweet}
        >
          <LucideIcon name={'GalleryVertical'} className="size-4 mr-2" />
          <span className="mr-4">Embed Tweet</span>
          <span className="text-helper-sm text-xs color-text-secondary ml-auto">
            Tab
          </span>
        </Button>
        <Button
          variant={'ghost'}
          className="text-body-sm justify-start px-2 py-[5px] gap-0"
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
