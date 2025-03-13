/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { EmbeddedTweet, Tweet } from 'react-tweet';

export const TweetComponentNodeView = ({ node, editor }: NodeViewProps) => {
  const [tweetData, setTweetData] = useState<any>(null);

  useEffect(() => {
    editor?.chain().focus();

    // Fetch tweet data from Vercel's API
    const fetchTweetData = async () => {
      try {
        const response = await fetch(
          `https://react-tweet.vercel.app/api/tweet/${node.attrs.tweetId}`,
        );
        const data = await response.json();
        setTweetData(data.data);
      } catch (error) {
        console.error('Error fetching tweet:', error);
      }
    };

    fetchTweetData();
  }, [node.attrs.tweetId]);

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      <div className="w-full flex justify-center items-center min-h-[200px]">
        {tweetData ? (
          <EmbeddedTweet tweet={tweetData} />
        ) : (
          <Tweet id={node.attrs.tweetId} />
        )}
      </div>
    </NodeViewWrapper>
  );
};
