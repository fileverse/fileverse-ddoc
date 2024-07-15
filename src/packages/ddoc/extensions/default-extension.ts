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
import { Document } from './document';
import { TrailingNode } from './trailing-node';
import { NodeType } from '@tiptap/pm/model';
import { InputRule } from '@tiptap/core';
import { actionButton } from './action-button';
import History from '@tiptap/extension-history';
import BulletList from '@tiptap/extension-bullet-list';
import { Markdown } from 'tiptap-markdown';

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
    orderedList: {
      HTMLAttributes: {
        class:
          'flex flex-col items-start list-decimal list-outside space-y-4 ml-6',
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: 'rounded-lg bg-[#E8EBEC] p-5 font-serif italic text-black',
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          'rounded-lg bg-transparent border border-[#DDE2E4] p-5 font-mono font-medium text-black',
      },
      exitOnArrowDown: true,
    },
    code: {
      HTMLAttributes: {
        class:
          'rounded bg-transparent p-1.5 font-mono font-medium text-black text-sm',
        spellcheck: 'false',
      },
    },
    history: false,
    gapcursor: false,
    dropcursor: false,
    document: false,
    horizontalRule: false,
  }),
  History,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  HorizontalRule,
  TiptapLink.extend({
    exitable: true,
  }).configure({
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
  TiptapUnderline.configure({
    HTMLAttributes: {
      class: 'select-text pointer-events-auto',
    },
  }),
  TextStyle,
  Color,
  TaskList.configure({
    HTMLAttributes: {
      class: 'not-prose space-y-4 !ml-0',
    },
  }),
  TaskItem.configure({
    HTMLAttributes: {
      class: 'flex items-start',
    },
    nested: true,
  }),
  BulletList.configure({
    HTMLAttributes: {
      class: 'space-y-4 !ml-6',
    },
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
  actionButton,
  ColumnExtension,
  Markdown.configure({
    html: true, // Allow HTML input/output
    tightLists: true, // No <p> inside <li> in markdown output
    tightListClass: 'tight', // Add class to <ul> allowing you to remove <p> margins when tight
    bulletListMarker: '-', // <li> prefix in markdown output
    linkify: true, // Create links from "https://..." text
    breaks: true, // New lines (\n) in markdown input are converted to <br>
    transformPastedText: true, // Allow to paste markdown text in the editor
    transformCopiedText: false, // Copied text is transformed to markdown
  }),
];

export const createInputRule = (
  pattern: RegExp,
  data: string,
  type: NodeType,
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
        tr.mapping.map(end),
      );

      // focus on the node that was just created
      commands.focus(end - 1);
    },
  });
};
