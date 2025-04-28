import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockNodeView from './components/code-block-node-view';

export const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive('codeBlock')) return false;
        return this.editor.commands.command(({ tr, state }) => {
          const { selection } = state;
          const { $from, $to } = selection;
          // Find the code block node and its start position
          const codeBlockPos = $from.before();
          const codeBlockNode = state.doc.nodeAt(codeBlockPos);
          if (!codeBlockNode || codeBlockNode.type.name !== 'codeBlock') return false;

          // Calculate selection inside the code block
          const start = $from.pos - codeBlockPos - 1;
          const end = $to.pos - codeBlockPos - 1;
          const text = codeBlockNode.textContent;
          const lines = text.split('\n');

          // Find which lines are selected
          let charCount = 0;
          let fromLine = 0, toLine = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount <= start) fromLine = i;
            if (charCount < end) toLine = i;
            charCount += lines[i].length + 1;
          }

          // Indent selected lines
          for (let i = fromLine; i <= toLine; i++) {
            lines[i] = '  ' + lines[i];
          }
          const newText = lines.join('\n');

          // Replace the code block content
          tr.replaceWith(
            codeBlockPos + 1,
            codeBlockPos + 1 + text.length,
            state.schema.text(newText)
          );
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
          if (!codeBlockNode || codeBlockNode.type.name !== 'codeBlock') return false;

          const start = $from.pos - codeBlockPos - 1;
          const end = $to.pos - codeBlockPos - 1;
          const text = codeBlockNode.textContent;
          const lines = text.split('\n');

          let charCount = 0;
          let fromLine = 0, toLine = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount <= start) fromLine = i;
            if (charCount < end) toLine = i;
            charCount += lines[i].length + 1;
          }

          // Outdent selected lines
          for (let i = fromLine; i <= toLine; i++) {
            lines[i] = lines[i].replace(/^ {1,2}/, '');
          }
          const newText = lines.join('\n');

          tr.replaceWith(
            codeBlockPos + 1,
            codeBlockPos + 1 + text.length,
            state.schema.text(newText)
          );
          return true;
        });
      },
    };
  },
});
