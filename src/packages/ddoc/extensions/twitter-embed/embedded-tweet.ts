/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react'
import { TweetComponentNodeView } from './tweet-component-node-view'

export interface EmbeddedTweetOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embeddedTweet: {
      /**
       * Add an tweet embed
       */
      setTweetEmbed: (options: { tweetId: string }) => ReturnType
    }
  }
}

export const EmbeddedTweet = Node.create<EmbeddedTweetOptions>({
  name: 'embeddedTweet',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: '',
      },
    }
  },

  addAttributes() {
    return {
      tweetId: {
        default: null,
      },
      align: {
        default: 'center',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-tweet-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetComponentNodeView)
  },

  addCommands() {
    return {
      setTweetEmbed:
        (options: { tweetId: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              tweetId: options.tweetId, // directly set the tweetId attribute
              align: 'center', // we can also set other attributes here
            },
            content: [],
          })
        },
    }
  },
})
