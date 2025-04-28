import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockNodeView from './components/code-block-node-view';

export const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
  addAttributes() {
    return {
      language: {
        default: 'plaintext',
        parseHTML: (element) =>
          element.getAttribute('data-language') || 'plaintext',
        renderHTML: (attributes) => ({ 'data-language': attributes.language }),
      },
      lineNumbers: {
        default: true,
        parseHTML: (element) =>
          element.hasAttribute('data-line-numbers')
            ? element.getAttribute('data-line-numbers') === 'true'
            : true,
        renderHTML: (attributes) => ({
          'data-line-numbers': String(attributes.lineNumbers),
        }),
      },
      wordWrap: {
        default: false,
        parseHTML: (element) =>
          element.hasAttribute('data-word-wrap')
            ? element.getAttribute('data-word-wrap') === 'true'
            : false,
        renderHTML: (attributes) => ({
          'data-word-wrap': String(attributes.wordWrap),
        }),
      },
      tabSize: {
        default: 2,
        parseHTML: (element) =>
          Number(element.getAttribute('data-tab-size')) || 2,
        renderHTML: (attributes) => ({
          'data-tab-size': String(attributes.tabSize),
        }),
      },
      shouldFocus: {
        default: false,
        parseHTML: (element) =>
          element.hasAttribute('data-should-focus')
            ? element.getAttribute('data-should-focus') === 'true'
            : false,
        renderHTML: (attributes) => ({
          'data-should-focus': String(attributes.shouldFocus),
        }),
      },
      code: {
        default: '',
        parseHTML: (element) => element.textContent || '',
        renderHTML: (attributes) => ({}),
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive('codeBlock')) return false;
        return this.editor.commands.command(({ tr, state }) => {
          const { selection } = state;
          const { $from, $to } = selection;
          const codeBlockPos = $from.before();
          const codeBlockNode = state.doc.nodeAt(codeBlockPos);
          if (!codeBlockNode || codeBlockNode.type.name !== 'codeBlock')
            return false;

          const tabSize = codeBlockNode.attrs.tabSize || 2;
          const start = $from.pos - codeBlockPos - 1;
          const end = $to.pos - codeBlockPos - 1;
          const text = codeBlockNode.textContent;
          const lines = text.split('\n');

          let charCount = 0;
          let fromLine = 0,
            toLine = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount <= start) fromLine = i;
            if (charCount < end) toLine = i;
            charCount += lines[i].length + 1;
          }

          for (let i = fromLine; i <= toLine; i++) {
            lines[i] = ' '.repeat(tabSize) + lines[i];
          }

          const newText = lines.join('\n');
          tr.replaceWith(
            codeBlockPos + 1,
            codeBlockPos + 1 + text.length,
            state.schema.text(newText),
          );

          // Adjust cursor position
          const newFrom = $from.pos + tabSize;
          const newTo = $to.pos + tabSize;
          tr.setSelection(state.selection.constructor.create(tr.doc, newFrom, newTo));

          return true;
        });
      },
      'Shift-Tab': () => {
        if (!this.editor.isActive('codeBlock')) return false;
        return this.editor.commands.command(({ tr, state }) => {
          const { selection } = state;
          const { $from, $to } = selection;
          const codeBlockPos = $from.before();
          const codeBlockNode = state.doc.nodeAt(codeBlockPos);
          if (!codeBlockNode || codeBlockNode.type.name !== 'codeBlock')
            return false;

          const tabSize = codeBlockNode.attrs.tabSize || 2;
          const start = $from.pos - codeBlockPos - 1;
          const end = $to.pos - codeBlockPos - 1;
          const text = codeBlockNode.textContent;
          const lines = text.split('\n');

          let charCount = 0;
          let fromLine = 0,
            toLine = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount <= start) fromLine = i;
            if (charCount < end) toLine = i;
            charCount += lines[i].length + 1;
          }

          for (let i = fromLine; i <= toLine; i++) {
            lines[i] = lines[i].replace(new RegExp(`^ {1,${tabSize}}`), '');
          }

          const newText = lines.join('\n');
          tr.replaceWith(
            codeBlockPos + 1,
            codeBlockPos + 1 + text.length,
            state.schema.text(newText),
          );

          // Adjust cursor position
          const newFrom = $from.pos - tabSize;
          const newTo = $to.pos - tabSize;
          tr.setSelection(state.selection.constructor.create(tr.doc, newFrom, newTo));

          return true;
        });
      },
    };
  },
});
