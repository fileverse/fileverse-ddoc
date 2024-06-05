/* eslint-disable @typescript-eslint/ban-ts-comment */
// define your extension array
/* eslint-disable @typescript-eslint/no-explicit-any */
import StarterKit from '@tiptap/starter-kit';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
import DropCursor from '@tiptap/extension-dropcursor';
import TiptapUnderline from '@tiptap/extension-underline';
import SlashCommand from '../components/slash-comand';
import HorizontalRule from './horizontal-rule';
import GapCursor from '@tiptap/extension-gapcursor';
import ColumnExtension from './multi-column';
import CustomKeymap from './custom-keymap';
import { Color } from '@tiptap/extension-color';
import { Iframe } from './iframe';
import { EmbeddedTweet } from './twitter-embed';
import { ResizableMedia } from './resizable-media';
import { DBlock } from './d-block';
import { uploadFn } from '../utils/upload-images';
import { SuperchargedTableExtensions } from './supercharged-table';
import { Document } from './document'
import { TrailingNode } from './trailing-node';
import { NodeType } from '@tiptap/pm/model';
import { InputRule } from '@tiptap/core';
import { actionButton } from './action-button';

export const defaultExtensions = [
  FontFamily,
  StarterKit.configure({
    strike: {
      HTMLAttributes: {
        class: 'select-text pointer-events-auto',
      },
    },
    bold: {
      HTMLAttributes: {
        class: 'select-text pointer-events-auto',
      },
    },
    italic: {
      HTMLAttributes: {
        class: 'select-text pointer-events-auto',
      },
    },
    heading: {
      HTMLAttributes: {
        class: 'select-text pointer-events-auto',
      },
    },
    paragraph: {
      HTMLAttributes: {
        class: 'select-text pointer-events-auto',
      },
    },
    bulletList: {
      HTMLAttributes: {
        class:
          'flex flex-col items-start list-disc list-outside space-y-4 ml-6',
      },
    },
    orderedList: {
      HTMLAttributes: {
        class:
          'flex flex-col items-start list-decimal list-outside space-y-4 ml-6',
      },
    },
    listItem: {
      HTMLAttributes: {
        class: 'leading-normal',
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: 'rounded-lg bg-stone-100 p-5 font-serif italic text-stone-800',
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          'rounded-lg bg-transparent border border-[#DDE2E4] p-5 font-mono font-medium text-stone-800',
      },
    },
    code: {
      HTMLAttributes: {
        class:
          'rounded-md bg-stone-200 p-1.5 font-mono font-medium text-black text-sm',
        spellcheck: 'false',
      },
    },
    history: false,
    gapcursor: false,
    dropcursor: false,
    document: false,
    horizontalRule: false,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  HorizontalRule,
  TiptapLink.configure({
    HTMLAttributes: {
      class:
        'text-blue-500 font-bold transition-colors cursor-pointer select-text pointer-events-auto',
    },
    openOnClick: true,
  }),
  Placeholder.configure({
    placeholder: () => '',
    includeChildren: true,
    showOnlyCurrent: true,
  }),
  Highlight.configure({ multicolor: true }),
  SlashCommand,
  TiptapUnderline.configure({
    HTMLAttributes: {
      class: 'select-text pointer-events-auto',
    },
  }),
  TextStyle,
  Color,
  TaskList.configure({
    HTMLAttributes: {
      class: 'not-prose space-y-4 ml-2',
    },
  }),
  TaskItem.configure({
    HTMLAttributes: {
      class: 'flex items-start',
    },
    nested: true,
  }),
  DropCursor.configure({
    width: 3,
    color: '#d1d5db',
  }),
  GapCursor,
  DBlock,
  TrailingNode,
  Document,
  ...SuperchargedTableExtensions,
  ResizableMedia.configure({
    uploadFn: uploadFn,
  }),
  CustomKeymap,
  Iframe,
  EmbeddedTweet,
  actionButton.extend({
    addInputRules() {
      return [
        createInputRule(/^(?:twt|###|___\s|\*\*\*\s)$/, 'twitter', this.type),
        createInputRule(/^(?:ytb|@@@|___\s|\*\*\*\s)$/, 'iframe', this.type),
      ];
    },
  }),
  ColumnExtension,
];

export const createInputRule = (
  pattern: RegExp,
  data: string,
  type: NodeType
) => {
  return new InputRule({
    find: pattern,
    // @ts-ignore
    handler: ({ state, range, commands }) => {
      const attributes = {
        data,
      };

      const { tr } = state;
      const start = range.from;
      const end = range.to;

      tr.insert(start - 1, type.create(attributes)).delete(
        tr.mapping.map(start),
        tr.mapping.map(end)
      );

      // focus on the node that was just created
      commands.focus(end - 1);
    },
  });
};
