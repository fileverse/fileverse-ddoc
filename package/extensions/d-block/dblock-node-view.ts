import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Decoration, NodeView, ViewMutationRecord } from '@tiptap/pm/view';
import { DBLOCK_HIDDEN_CLASS, getDBlockRenderMeta } from './dblock-collapse';
import type { DBlockRuntimeState } from './dblock-runtime';
import { getDBlockRuntimeState } from './dblock-runtime';

interface DBlockNodeViewOptions {
  editor: Editor;
  node: ProseMirrorNode;
  getPos: () => number;
  decorations: readonly Decoration[];
  HTMLAttributes: Record<string, unknown>;
  getRuntimeState?: () => DBlockRuntimeState;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const hasHiddenDecoration = (decorations: readonly Decoration[]) =>
  decorations.some((decoration) =>
    String(
      (decoration as { type?: { attrs?: { class?: string } } }).type?.attrs
        ?.class ?? '',
    )
      .split(/\s+/)
      .includes(DBLOCK_HIDDEN_CLASS),
  );

const setAttributes = (
  element: HTMLElement,
  attributes: Record<string, unknown>,
) => {
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class' || value === undefined || value === null) return;
    element.setAttribute(key, String(value));
  });
};

export class DBlockNodeView implements NodeView {
  node: ProseMirrorNode;
  editor: Editor;
  getPos: () => number;
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;
  private decorations: readonly Decoration[];
  private getRuntimeState?: () => DBlockRuntimeState;

  constructor({
    editor,
    node,
    getPos,
    decorations,
    HTMLAttributes,
    getRuntimeState,
  }: DBlockNodeViewOptions) {
    this.editor = editor;
    this.node = node;
    this.getPos = getPos;
    this.decorations = decorations;
    this.getRuntimeState = getRuntimeState;

    this.dom = document.createElement('div');
    this.dom.dataset.type = 'd-block';
    setAttributes(this.dom, HTMLAttributes);

    this.contentDOM = document.createElement('div');
    this.contentDOM.dataset.nodeViewContent = 'true';
    this.dom.appendChild(this.contentDOM);

    this.syncDOM();
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.decorations = decorations;
    this.syncDOM();
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === 'selection') return false;
    return !this.contentDOM.contains(mutation.target);
  }

  private syncDOM() {
    const runtime = getDBlockRuntimeState(this.getRuntimeState);
    const isPresentationPreview =
      runtime.isPresentationMode && runtime.isPreviewMode;
    const position = this.safeGetPos();
    const meta = getDBlockRenderMeta(this.node, position ?? 0);
    const shouldHide =
      !isPresentationPreview && hasHiddenDecoration(this.decorations);

    this.dom.className = joinClasses(
      'd-block w-full relative',
      meta.isTable && 'is-table pointer-events-auto',
      this.node.attrs?.isCorrupted && 'invalid-content',
      isPresentationPreview && 'pointer-events-none',
      shouldHide && DBLOCK_HIDDEN_CLASS,
    );
  }

  private safeGetPos() {
    try {
      const position = this.getPos();
      return typeof position === 'number' ? position : null;
    } catch {
      return null;
    }
  }
}
