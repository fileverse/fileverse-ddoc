import { useEffect, useRef } from 'react';
import {
  EditorState,
  Annotation,
  RangeSetBuilder,
  Transaction,
} from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder,
  keymap,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  syntaxTree,
} from '@codemirror/language';

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

// A clipboard payload that is a single URL (one token, no internal whitespace).
const SINGLE_URL = /^https?:\/\/\S+$/i;

// Paste a URL → make it a clickable link instead of plain text: wrap a selection
// as [text](url), or insert a bare URL as a markdown autolink <url>. Both render
// as real links in the right pane. Non-URL pastes fall through to the default.
const urlPasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const pasted = event.clipboardData?.getData('text/plain')?.trim();
    if (!pasted || !SINGLE_URL.test(pasted)) return false;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const insert = selected ? `[${selected}](${pasted})` : `<${pasted}>`;
    event.preventDefault();
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
    });
    return true;
  },
});

// Color markdown links with the editor's text-link token (matches the doc's own
// link color). We mark Link ([text](url)) and Autolink (<url>) nodes from the
// markdown syntax tree — no extra dependency, the color comes from CSS below.
const linkDecoration = Decoration.mark({ class: 'cm-md-link' });
const LINK_NODES = new Set(['Link', 'Autolink']);

const buildLinkDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (LINK_NODES.has(node.name) && node.to > node.from) {
          builder.add(node.from, node.to, linkDecoration);
        }
      },
    });
  }
  return builder.finish();
};

const linkColorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildLinkDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildLinkDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// Left pane theme: secondary-gray line numbers in a ~26px gutter, subtle
// full-width active-line band, monospace ~14px / 1.7.
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
  // Markdown links use the editor's text-link token (override the default
  // syntax color, incl. the inner highlight spans).
  '.cm-md-link, .cm-md-link span': {
    color: 'hsla(var(--color-text-link)) !important',
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
          // Swallow Ctrl/Cmd+S so it doesn't open the browser "Save page"
          // dialog — there's no manual save in Split View (changes are live).
          keymap.of([
            { key: 'Mod-s', run: () => true, preventDefault: true },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          linkColorPlugin,
          urlPasteHandler,
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
      // Keep the seed out of the undo history: its base state is the empty
      // mount-time doc, so an undo would revert the pane to empty and the
      // change listener would replace the whole document with nothing.
      annotations: [
        ProgrammaticUpdate.of(true),
        Transaction.addToHistory.of(false),
      ],
    });
  }, [value]);

  return <div ref={hostRef} className="w-full h-full overflow-auto" />;
}
