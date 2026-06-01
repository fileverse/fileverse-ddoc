import { useEffect, useRef } from 'react';
import { EditorState, Annotation } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder,
  keymap,
} from '@codemirror/view';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

interface MarkdownSourcePaneProps {
  value: string;
  onChange: (value: string) => void;
  /** Reports the CodeMirror view so the toolbar can issue markdown commands. */
  onViewReady?: (view: EditorView | null) => void;
}

const PLACEHOLDER = 'Jot down your ideas and grow them 💡';

// Marks programmatic doc updates (the seed / external value sync) so the change
// listener can ignore them — only real user edits should reparse into the doc.
const ProgrammaticUpdate = Annotation.define<boolean>();

// Matches the Figma left pane: monochrome (no syntax coloring — we intentionally
// add no syntaxHighlighting extension), secondary-gray line numbers in a ~26px
// gutter, subtle full-width active-line band, monospace ~14px / 1.7.
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: 'hsl(var(--color-text-default))',
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineHeight: '1.7',
    padding: '12px 16px 12px 8px',
  },
  '.cm-content': { caretColor: 'hsl(var(--color-text-default))', padding: '0' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'hsl(var(--color-text-secondary))',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '26px',
    padding: '0 8px 0 4px',
  },
  '.cm-activeLine': { backgroundColor: 'hsl(var(--color-bg-secondary))' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'hsl(var(--color-text-default))',
  },
});

/**
 * CodeMirror 6 markdown source editor (Split View left pane).
 *
 * Default export + lazy-loaded by split-view-layout so CodeMirror is a
 * separate chunk that only loads/instantiates when Split View opens.
 */
export default function MarkdownSourcePane({
  value,
  onChange,
  onViewReady,
}: MarkdownSourcePaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep the latest callbacks without re-creating the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onViewReadyRef = useRef(onViewReady);
  onViewReadyRef.current = onViewReady;

  // Create the editor once on mount, destroy on unmount.
  useEffect(() => {
    if (!hostRef.current) return;

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          placeholder(PLACEHOLDER),
          EditorView.lineWrapping,
          editorTheme,
          EditorView.updateListener.of((update) => {
            // Ignore programmatic updates (seed / value sync) — only user edits
            // should reparse into the doc, so opening Split View is lossless.
            const isProgrammatic = update.transactions.some((tr) =>
              tr.annotation(ProgrammaticUpdate),
            );
            if (update.docChanged && !isProgrammatic) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    viewRef.current = view;
    onViewReadyRef.current?.(view);
    return () => {
      onViewReadyRef.current?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // Init once — external value changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. the one-shot seed that resolves after
  // mount) into the editor, without clobbering the user's own typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value === current) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      annotations: ProgrammaticUpdate.of(true),
    });
  }, [value]);

  return <div ref={hostRef} className="w-full h-full overflow-auto" />;
}
