/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core'
import { ActionButtonNodeView } from './action-button-node-view'
import { ReactNodeViewRenderer } from '@tiptap/react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    actionButton: {
      /**
       * Toggle a actionButton
       */
      setActionButton: (option?: string) => ReturnType
    }
  }
}

export interface ActionButtonOptions {
  HTMLAttributes: Record<string, any>
}

export const actionButton = Node.create<ActionButtonOptions>({
  name: 'actionButton',

  group: 'block',

  content: 'block*',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'rounded-lg bg-stone-500',
      },
    }
  },

  addAttributes() {
    return {
      data: {
        default: null,
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ActionButtonNodeView)
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-action-node]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    console.log('action')
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-action-node': '' }),
      0,
    ]
  },

  addCommands() {
    return {
      setActionButton:
        (option) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              data: option,
            },
            content: [],
          })
        },
    }
  },
})
