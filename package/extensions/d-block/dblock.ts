/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dispatch, Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
import { Transaction } from '@tiptap/pm/state';
import { IpfsImageUploadResponse } from '../../types';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onCopyHeadingLink?: (link: string) => void;
  hasAvailableModels: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dBlock: {
      setDBlock: (position?: number) => ReturnType;
    };
  }
}

export const DBlock = Node.create<DBlockOptions>({
  name: 'dBlock',

  priority: 1000,

  group: 'dBlock',

  content: '(block|columns)',

  draggable: true,

  selectable: false,

  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onCopyHeadingLink: undefined,
      hasAvailableModels: false,
    };
  },

  addAttributes() {
    return {
      isCorrupted: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="d-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: any }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'd-block' }),
      0,
    ];
  },

  addCommands() {
    return {
      setDBlock:
        (position) =>
        ({ state, chain }) => {
          const {
            selection: { from },
          } = state;

          const pos =
            position !== undefined || position !== null ? from : position;

          return chain()
            .insertContentAt(pos, {
              type: this.name,
              content: [
                {
                  type: 'paragraph',
                },
              ],
            })
            .focus(pos + 2)
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setDBlock(),
      // Tab: Indent list item (sink)
      // DBlock has priority 1000, so we need to explicitly handle Tab for lists
      Tab: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;
        const node = $from.node($from.depth);

        // Check if there's an active AI autocomplete suggestion - if so, let it handle Tab
        const hasAutocompleteSuggestion =
          typeof document !== 'undefined' &&
          document.querySelector('.autocomplete-suggestion-container') !== null;
        if (hasAutocompleteSuggestion) {
          return false; // Let AI autocomplete handle the Tab key
        }

        const isParagraph = node.type.name === 'paragraph';
        const isHeading = node.type.name === 'heading';
        const depth = $from.depth;

        // Checking if it's nested since standard paragraphs are usually at depth 1.
        const parentNode = depth > 0 ? $from.node(depth - 1) : null;
        const isParagraphUnderDBlock =
          isParagraph && parentNode?.type.name === 'dBlock';

        // Allow inserting EM SPACE if node is a heading or a non-nested paragraph.
        if (isHeading || isParagraphUnderDBlock) {
          // TODO: check with '\t' character and other HTML entities.
          editor.commands.insertContent('\u2003', {
            parseOptions: {
              preserveWhitespace: 'full',
            },
          });
          return true;
        }

        // Check if we're in a list item or task item
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);

          if (node.type.name === 'listItem') {
            // Try to sink the list item
            // If it's the first item, sinkListItem will return false and nothing happens
            editor.commands.sinkListItem('listItem');

            // Always return true to prevent browser Tab behavior
            return true;
          }

          if (node.type.name === 'taskItem') {
            // Try to sink the task item
            // If it's the first item, sinkListItem will return false and nothing happens
            editor.commands.sinkListItem('taskItem');

            // Always return true to prevent browser Tab behavior
            return true;
          }
        }

        // Not in a list, let browser handle it
        return false;
      },
      // Shift+Tab: Unindent list item (lift)
      'Shift-Tab': ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        if ($from.pos > 0) {
          const charBeforeCursor = editor.state.doc.textBetween(
            $from.pos - 1,
            $from.pos,
            '\0', // Separator for textBetween, '\0' for no separator
          );

          // If the character before the cursor is an EM SPACE, delete it
          if (charBeforeCursor === '\u2003') {
            editor
              .chain()
              .deleteRange({ from: $from.pos - 2, to: $from.pos }) // this range allows for the removal of em spaces in the same amount of tabs
              .run();
            return true; // Consume the event, preventing further handling
          }
        }

        // Check if we're in a list item or task item
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);

          if (node.type.name === 'listItem') {
            return editor.commands.liftListItem('listItem');
          }
          if (node.type.name === 'taskItem') {
            return editor.commands.liftListItem('taskItem');
          }
        }

        // Not in a list, let browser handle it
        return false;
      },
      Enter: ({ editor }) => {
        const {
          selection: { $head, from, to },
          doc,
        } = editor.state;
        const attrs = editor.getAttributes('textStyle');

        // Get the current node and its parent
        const currentNode = $head.node($head.depth);
        const parent = $head.node($head.depth - 1);
        const headString = $head.toString();
        const nodePaths = headString.split('/');
        const isAtEndOfTheNode = $head.end() === from;
        const isAtStartOfTheNode = $head.start() === from;

        // Check if inside table
        const isInsideTable = nodePaths.some((path) => path.includes('table'));

        // Handle lists press enter action
        if (
          parent?.type.name === 'listItem' ||
          parent?.type.name === 'taskItem'
        ) {
          // 🛡️ Check if inside table - if so, don't handle lists specially
          if (isInsideTable) {
            return false;
          }

          const isCurrentItemEmpty = currentNode.textContent === '';
          const grandParent = $head.node($head.depth - 2);
          const currentIndex = $head.index($head.depth - 2);
          const isLastItem = currentIndex === grandParent.childCount - 1;

          // 🛡️ Check nesting depth: only allow this on top-level lists
          let listDepth = 0;
          for (let d = $head.depth - 1; d >= 0; d--) {
            const node = $head.node(d);
            if (
              node?.type.name === 'listItem' ||
              node?.type.name === 'taskItem'
            ) {
              listDepth++;
            }
          }

          const isTopLevelList = listDepth === 1;

          // Handle empty items at top level (both last and non-last)
          if (isCurrentItemEmpty && isTopLevelList) {
            const listNode = $head.node($head.depth - 2);
            const currentItem = listNode.child(currentIndex);
            const currentItemStart = $head.before($head.depth - 1);
            const currentItemEnd = currentItemStart + currentItem.nodeSize;

            // Check if the current item has nested content (bulletList or orderedList)
            let hasNestedContent = false;
            currentItem.forEach((node) => {
              if (
                node.type.name === 'bulletList' ||
                node.type.name === 'orderedList'
              ) {
                hasNestedContent = true;
              }
            });

            // If the current item has nested content, don't delete it!
            // This prevents deleting parent items with nested children
            if (hasNestedContent) {
              return false; // Let default behavior handle it
            }

            // If it's the last item, exit the list and create a text block
            if (isLastItem) {
              return editor
                .chain()
                .deleteRange({ from: currentItemStart, to: currentItemEnd })
                .insertContentAt(currentItemStart, {
                  type: 'dBlock',
                  content: [{ type: 'paragraph' }],
                })
                .focus(currentItemStart + 2)
                .unsetAllMarks()
                .run();
            }

            // If it's not the last item, just delete it and move cursor to next item
            return editor
              .chain()
              .deleteRange({ from: currentItemStart, to: currentItemEnd })
              .run();
          }
          //nested lists are handled by tiptap's default list behavior
        }

        // Handle blockquote
        if (
          parent?.type.name === 'blockquote' &&
          currentNode.type.name === 'paragraph'
        ) {
          if (currentNode.textContent === '') {
            return editor
              .chain()
              .setDBlock()
              .focus(from + 2)
              .setMark('textStyle', attrs)
              .run();
          }
        }

        if (parent?.type.name !== 'dBlock') {
          // If inside table, do nothing
          if (isInsideTable) {
            return false;
          }
        }

        // Handle dBlock content
        if (parent?.type.name === 'dBlock') {
          let currentActiveNodeTo = -1;
          let currentActiveNodeType = '';

          doc.descendants((node, pos) => {
            if (currentActiveNodeTo !== -1) return false;
            if (node.type.name === this.name) return;

            const [nodeFrom, nodeTo] = [pos, pos + node.nodeSize];

            if (nodeFrom <= from && to <= nodeTo) {
              currentActiveNodeTo = nodeTo;
              currentActiveNodeType = node.type.name;
            }
            return false;
          });

          const content = doc
            .slice(from, currentActiveNodeTo)
            ?.toJSON().content;

          try {
            if (currentActiveNodeType === 'codeBlock') {
              return editor
                .chain()
                .newlineInCode()
                .setMark('textStyle', attrs)
                .focus()
                .run();
            }

            if (
              ['columns', 'heading'].includes(currentActiveNodeType) &&
              isAtEndOfTheNode
            ) {
              return editor
                .chain()
                .insertContent({
                  type: 'dBlock',
                  content: [
                    {
                      type: 'paragraph',
                    },
                  ],
                })
                .focus(from + 4)
                .setMark('textStyle', attrs)
                .run();
            } else if (
              currentActiveNodeType === 'columns' ||
              (currentActiveNodeType === 'heading' && !isAtStartOfTheNode)
            ) {
              return editor
                .chain()
                .command(
                  ({
                    tr,
                    dispatch,
                  }: {
                    tr: Transaction;
                    dispatch: Dispatch;
                  }) => {
                    if (dispatch) {
                      tr.insertText('\n');
                    }
                    return true;
                  },
                )
                .focus(from)
                .setMark('textStyle', attrs)
                .run();
            }

            return editor
              .chain()
              .insertContentAt(
                { from, to: currentActiveNodeTo },
                {
                  type: this.name,
                  content,
                },
              )
              .focus(from + 4)
              .setMark('textStyle', attrs)
              .run();
          } catch (error) {
            console.error(`Error inserting content into dBlock node: ${error}`);
            return false;
          }
        }

        return false;
      },
      Backspace: ({ editor }) => {
        const {
          selection: { $head, from, to },
          doc,
        } = editor.state;

        // Handle selection deletion first
        if (from !== to) {
          if (from <= 2) {
            return false;
          }
          return editor.chain().deleteSelection().focus().run();
        }

        const parent = $head.node($head.depth - 1);
        const node = $head.node($head.depth);
        const nodeStartPos = $head.start();
        const isAtStartOfNode = nodeStartPos === from;

        const isListOrTaskList =
          parent?.type.name === 'listItem' || parent?.type.name === 'taskItem';

        // If not in a dBlock, handle special cases
        if (parent?.type.name !== 'dBlock') {
          // Handle page break
          let isPrevNodePageBreak = false;
          let currentNodePos = -1;

          doc.descendants((node, pos) => {
            if (currentNodePos !== -1) return false;
            if (node.type.name === 'pageBreak' && pos < from) {
              isPrevNodePageBreak = true;
              currentNodePos = pos;
            }
          });

          if (isPrevNodePageBreak && from === currentNodePos + 2) {
            return true;
          }

          // Handle list items
          if (isAtStartOfNode && isListOrTaskList) {
            const isFirstItem = $head.index($head.depth - 2) === 0;
            // Check if this is a nested list item (has parent list items above it)
            let isNestedItem = false;
            const isNodeEmpty = node?.textContent === '';
            for (let d = $head.depth - 3; d >= 0; d--) {
              const ancestorNode = $head.node(d);
              if (
                ancestorNode.type.name === 'listItem' ||
                ancestorNode.type.name === 'taskItem'
              ) {
                isNestedItem = true;
                break;
              }
            }

            const itemType =
              parent?.type.name === 'taskItem' ? 'taskItem' : 'listItem';

            // If it's a nested item (empty or not empty), try to lift it.
            // This is consistent with standard list behavior.
            if (isNodeEmpty && !isFirstItem) {
              return false;
            }

            if (isNestedItem) {
              return editor.commands.liftListItem(itemType);
            }

            // For top-level list items (empty or not empty) at the start:
            // Return false to allow Tiptap's default Backspace handling to take over.
            return false;
          }
        }

        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DBlockNodeView as any);
  },

  addProseMirrorPlugins() {
    if (!this.options.hasAvailableModels) {
      return [];
    }
    return [
      new Plugin({
        key: new PluginKey('dblock-aiwriter-space'),
        props: {
          handleTextInput: (view, from, _to, text) => {
            // Only interested in single space
            if (text !== ' ') return false;

            // Check if there's already an active AI Writer
            let hasActiveAIWriter = false;
            view.state.doc.descendants((node) => {
              if (node.type.name === 'aiWriter') {
                hasActiveAIWriter = true;
                return false;
              }
              return true;
            });

            if (hasActiveAIWriter) {
              return false;
            }

            const { state, dispatch } = view;
            const { $from } = state.selection;
            const parent = $from.node($from.depth - 1);
            const node = $from.node($from.depth);
            // Only trigger in dBlock > paragraph, and only if paragraph is empty
            if (
              parent?.type?.name === 'dBlock' &&
              node?.type?.name === 'paragraph' &&
              node.textContent === ''
            ) {
              // Check if previous char is also a space (double space)
              const prevChar = state.doc.textBetween(from - 1, from, '\0');
              if (prevChar === ' ') {
                // Allow double space as normal
                return false;
              }
              // Replace the empty paragraph with aiWriter node
              const aiWriterNode = state.schema.nodes.aiWriter.create({
                prompt: '',
                content: '',
                tone: 'neutral',
              });
              const tr = state.tr.replaceRangeWith(
                $from.before(),
                $from.after(),
                aiWriterNode,
              );
              dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
