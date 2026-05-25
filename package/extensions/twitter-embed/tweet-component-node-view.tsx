/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ReactNode, useEffect, useState } from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { EmbeddedTweet, Tweet } from 'react-tweet';

// react-tweet's getEntities iterates over hashtags/user_mentions/urls/symbols
// unconditionally — missing arrays throw "is not iterable". Default them to [].
const EMPTY_ENTITIES = {
  hashtags: [],
  user_mentions: [],
  urls: [],
  symbols: [],
};

const normalizeEntities = (entities: any) =>
  entities ? { ...EMPTY_ENTITIES, ...entities } : EMPTY_ENTITIES;

const normalizeTweet = (tweet: any) => {
  if (!tweet) return tweet;
  return {
    ...tweet,
    entities: normalizeEntities(tweet.entities),
    quoted_tweet: tweet.quoted_tweet
      ? {
          ...tweet.quoted_tweet,
          entities: normalizeEntities(tweet.quoted_tweet.entities),
        }
      : tweet.quoted_tweet,
  };
};

class TweetErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error('EmbeddedTweet render failed:', err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export const TweetComponentNodeView = ({ node, editor }: NodeViewProps) => {
  const [tweetData, setTweetData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    editor?.chain().focus();

    const fetchTweetData = async () => {
      try {
        const response = await fetch(
          `https://react-tweet.vercel.app/api/tweet/${node.attrs.tweetId}`,
        );
        if (!response.ok) {
          throw new Error(`tweet fetch failed: ${response.status}`);
        }
        const json = await response.json();
        if (!json?.data) {
          throw new Error('tweet payload missing');
        }
        setTweetData(normalizeTweet(json.data));
      } catch (error) {
        console.error('Error fetching tweet:', error);
        setError(true);
      }
    };

    fetchTweetData();
  }, [node.attrs.tweetId]);

  const tweetUrl = `https://twitter.com/i/status/${node.attrs.tweetId}`;

  const linkFallback = (
    <a
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      {tweetUrl}
    </a>
  );

  return (
    <NodeViewWrapper
      as="div"
      className="flex gap-2 group w-full relative justify-center items-start"
    >
      {error ? (
        linkFallback
      ) : (
        <div className="w-full flex justify-center items-center min-h-[200px]">
          {tweetData ? (
            <TweetErrorBoundary fallback={linkFallback}>
              <EmbeddedTweet tweet={tweetData} />
            </TweetErrorBoundary>
          ) : (
            <Tweet id={node.attrs.tweetId} />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};
