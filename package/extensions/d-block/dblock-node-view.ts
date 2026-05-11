import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Decoration, NodeView, ViewMutationRecord } from '@tiptap/pm/view';
import { v4 as uuidv4 } from 'uuid';
import {
  DBLOCK_HIDDEN_CLASS,
  getDBlockRenderMeta,
  getHeadingAlignmentClass,
} from './dblock-collapse';
import type { DBlockRuntimeState } from './dblock-runtime';
import { getDBlockRuntimeState } from './dblock-runtime';
import {
  registerDBlockView,
  trackDestroyedDBlockNodeViewRefs,
} from './dblock-view-registry';

interface DBlockNodeViewOptions {
  editor: Editor;
  node: ProseMirrorNode;
  getPos: () => number;
  decorations: readonly Decoration[];
  HTMLAttributes: Record<string, unknown>;
  getRuntimeState?: () => DBlockRuntimeState;
  onCopyHeadingLink?: (link: string) => void;
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
    if (key === 'class' || value === undefined || value === null) {
      return;
    }

    element.setAttribute(key, String(value));
  });
};

export class DBlockNodeView implements NodeView {
  node: ProseMirrorNode;

  editor: Editor;

  getPos: () => number;

  dom: HTMLDivElement;

  gutterElement: HTMLElement;

  contentElement: HTMLDivElement;

  contentDOM: HTMLDivElement;

  private id: string;

  private decorations: readonly Decoration[];

  private getRuntimeState?: () => DBlockRuntimeState;

  private unregister: () => void;

  constructor({
    editor,
    node,
    getPos,
    decorations,
    HTMLAttributes,
    getRuntimeState,
    onCopyHeadingLink,
  }: DBlockNodeViewOptions) {
    this.editor = editor;
    this.node = node;
    this.getPos = getPos;
    this.decorations = decorations;
    this.getRuntimeState = getRuntimeState;
    this.id = uuidv4();

    this.dom = document.createElement('div');
    this.dom.dataset.type = 'd-block';
    this.dom.dataset.dblockNodeView = 'true';
    this.dom.dataset.nodeViewWrapper = 'true';
    this.dom.setAttribute('data-dblock-id', this.id);
    setAttributes(this.dom, HTMLAttributes);

    this.gutterElement = document.createElement('section');
    this.gutterElement.className =
      'flex gap-[2px] min-w-5 lg:min-w-16 justify-end';
    this.gutterElement.setAttribute('aria-label', 'left-menu');
    this.gutterElement.setAttribute('contenteditable', 'false');
    this.gutterElement.dataset.dblockGutter = 'true';

    this.contentElement = document.createElement('div');
    this.contentElement.dataset.dblockContentShell = 'true';

    this.contentDOM = document.createElement('div');
    this.contentDOM.dataset.nodeViewContent = 'true';

    this.contentElement.appendChild(this.contentDOM);
    this.dom.append(this.gutterElement, this.contentElement);

    this.unregister = registerDBlockView({
      id: this.id,
      dom: this.dom,
      gutterElement: this.gutterElement,
      contentElement: this.contentElement,
      getPos: this.getPos,
      getNode: () => this.node,
      refresh: () => this.syncDOM(),
      onCopyHeadingLink,
    });

    this.syncDOM();
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.decorations = decorations;
    this.syncDOM();
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === 'selection') {
      return false;
    }

    return !this.contentDOM.contains(mutation.target);
  }

  stopEvent(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    const gutterTarget = target.closest('[data-dblock-gutter]');
    if (!gutterTarget) {
      return false;
    }

    const isDragHandle = Boolean(target.closest('[data-drag-handle]'));
    if (
      isDragHandle &&
      (event.type.startsWith('drag') ||
        event.type === 'mousedown' ||
        event.type === 'pointerdown')
    ) {
      return false;
    }

    return true;
  }

  destroy() {
    trackDestroyedDBlockNodeViewRefs({
      nodeView: this,
      dom: this.dom,
      gutterElement: this.gutterElement,
      contentElement: this.contentElement,
      contentDOM: this.contentDOM,
    });
    this.unregister();
  }

  private syncDOM() {
    const runtime = getDBlockRuntimeState(this.getRuntimeState);
    const isPresentationPreview =
      runtime.isPresentationMode && runtime.isPreviewMode;
    const position = this.safeGetPos();
    const meta = getDBlockRenderMeta(this.node, position ?? 0);
    const shouldHide =
      !isPresentationPreview && hasHiddenDecoration(this.decorations);

    this.dom.className = isPresentationPreview
      ? joinClasses(
          'flex px-4 md:px-[80px] gap-2 group w-full relative justify-center items-start',
          meta.isTable && 'pointer-events-auto',
        )
      : joinClasses(
          'flex px-4 pl-2 md:pr-8 lg:pr-[80px] lg:pl-[8px] gap-2 group w-full relative justify-center items-center',
          meta.isTable && 'pointer-events-auto',
          shouldHide && DBLOCK_HIDDEN_CLASS,
        );

    this.contentElement.className = isPresentationPreview
      ? joinClasses(
          'node-view-content w-full relative',
          meta.isTable && 'is-table',
          this.node.attrs?.isCorrupted && 'invalid-content',
          runtime.isPreviewMode && 'pointer-events-none',
        )
      : joinClasses(
          'node-view-content w-full relative self-center group/collision',
          meta.isTable && 'is-table max-w-full lg:max-w-[90%]',
          this.node.attrs?.isCorrupted && 'invalid-content',
          meta.isHeading &&
            runtime.isPreviewMode &&
            'flex flex-row-reverse gap-2 items-center',
          meta.isHeading &&
            runtime.isPreviewMode &&
            getHeadingAlignmentClass(meta.headingAlignment),
        );

    this.gutterElement.hidden = isPresentationPreview;

    if (position !== null) {
      this.dom.dataset.dblockPos = String(position);
    } else {
      delete this.dom.dataset.dblockPos;
    }
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
