/* eslint-disable @typescript-eslint/ban-ts-comment */
// define your extension array

import StarterKit from '@tiptap/starter-kit';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
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
import { DBlock } from './d-block';
import { SuperchargedTableExtensions } from './supercharged-table';
import { Document } from './document';
import { TrailingNode } from './trailing-node';
import { NodeType } from '@tiptap/pm/model';
import { InputRule } from '@tiptap/core';
import { actionButton } from './action-button';
import BulletList from '@tiptap/extension-bullet-list';
import { Markdown } from 'tiptap-markdown';
import ListItem from '@tiptap/extension-list-item';
import Typography from '@tiptap/extension-typography';
import MarkdownPasteHandler from './mardown-paste-handler';
import CharacterCount from '@tiptap/extension-character-count';
import { MathExtension } from '@aarkue/tiptap-math-extension';
import { Footnote } from './footnote/footnote';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { ResizableMedia } from './resizable-media';
import { uploadFn } from '../utils/upload-images';

export const defaultExtensions = (
  onError: (error: string) => void,
  secureImageUploadUrl?: string,
) => [
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
        class:
          'pl-4 border-l-4 color-border-default italic color-text-secondary my-2',
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          'rounded-lg bg-transparent border color-border-default p-5 font-mono font-medium color-text-default select-text pointer-events-auto',
      },
      exitOnArrowDown: true,
    },
    code: {
      HTMLAttributes: {
        class:
          'rounded bg-transparent p-1.5 font-mono font-medium color-text-default text-body-sm',
        spellcheck: 'false',
      },
    },
    history: false,
    gapcursor: false,
    dropcursor: false,
    document: false,
    horizontalRule: false,
    bulletList: false,
    listItem: false,
  }),
  Typography,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  HorizontalRule,
  Link.extend({
    exitable: true,
    inclusive: false,
  }).configure({
    HTMLAttributes: {
      class:
        'color-text-link font-bold transition-colors cursor-pointer select-text pointer-events-auto',
      rel: 'noopener noreferrer',
    },
    validate: (href) => /^https?:\/\//.test(href),
    openOnClick: true,
    autolink: true,
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
  ListItem.configure({
    HTMLAttributes: {
      class: 'leading-normal',
    },
  }),
  DropCursor.configure({
    width: 3,
    color: '#d1d5db',
  }),
  ResizableMedia.configure({
    uploadFn: uploadFn,
    onError: onError,
    secureImageUploadUrl,
  }),
  GapCursor,
  DBlock.configure({
    secureImageUploadUrl,
  }),
  TrailingNode,
  Document,
  ...SuperchargedTableExtensions,
  CustomKeymap,
  Iframe,
  EmbeddedTweet,
  actionButton,
  ColumnExtension,
  MarkdownPasteHandler,
  Markdown.configure({
    html: true, // Allow HTML input/output
    tightLists: true, // No <p> inside <li> in markdown output
    tightListClass: 'tight', // Add class to <ul> allowing you to remove <p> margins when tight
    bulletListMarker: '-', // <li> prefix in markdown output
    linkify: true, // Create links from "https://..." text
    breaks: true, // New lines (\n) in markdown input are converted to <br>
    transformPastedText: true, // Allow to paste markdown text in the editor
    // transformCopiedText: true, // Copied text is transformed to markdown
  }),
  CharacterCount,
  MathExtension.configure({
    addInlineMath: true,
    evaluation: false,
    delimiters: 'dollar',
  }),
  Footnote,
  Superscript.configure({
    HTMLAttributes: {
      class: 'superscript',
    },
  }),
  Subscript.configure({
    HTMLAttributes: {
      class: 'subscript',
    },
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
