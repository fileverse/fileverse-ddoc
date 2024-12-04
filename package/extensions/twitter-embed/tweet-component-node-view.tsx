import { useEffect, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { TwitterTweetEmbed } from 'react-twitter-embed';
import { LucideIcon } from '@fileverse/ui';

export const TweetComponentNodeView = ({ node, editor }: NodeViewProps) => {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    editor?.chain().focus();
  }, []);

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      <div className="w-full max-w-sm flex justify-center items-center">
        {loading && (
          <LucideIcon
            name="LoaderCircle"
            size="lg"
            className="animate-spin"
            fill="transparent"
            stroke="currentColor"
          />
        )}
        <TwitterTweetEmbed
          tweetId={node.attrs.tweetId}
          onLoad={() => setLoading(false)}
        />
      </div>
    </NodeViewWrapper>
  );
};
