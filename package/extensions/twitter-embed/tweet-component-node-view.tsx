/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { EmbeddedTweet, Tweet } from 'react-tweet';

export const TweetComponentNodeView = ({ node, editor }: NodeViewProps) => {
  const [tweetData, setTweetData] = useState<any>(null);
  const [error, setError] = useState(false);

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
        setError(true);
      }
    };

    fetchTweetData();
  }, [node.attrs.tweetId]);

  const tweetUrl = `https://twitter.com/i/status/${node.attrs.tweetId}`;

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      {error ? (
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {tweetUrl}
        </a>
      ) : (
        <div className="w-full flex justify-center items-center min-h-[200px]">
          {tweetData ? (
            <EmbeddedTweet tweet={tweetData} />
          ) : (
            <Tweet id={node.attrs.tweetId} />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};
