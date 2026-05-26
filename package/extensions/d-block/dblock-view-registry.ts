import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface DBlockViewHandle {
  id: string;
  dom: HTMLElement;
  gutterElement: HTMLElement;
  contentElement: HTMLElement;
  getPos: () => number;
  getNode: () => ProseMirrorNode;
  refresh: () => void;
  onCopyHeadingLink?: (link: string) => void;
}

const handleByElement = new WeakMap<Element, DBlockViewHandle>();
const registeredHandles = new Set<DBlockViewHandle>();

const isElement = (value: unknown): value is Element =>
  typeof Element !== 'undefined' && value instanceof Element;

const getElementFromTarget = (target: EventTarget | null): Element | null => {
  if (!target) {
    return null;
  }

  if (isElement(target)) {
    return target;
  }

  if (
    typeof Node !== 'undefined' &&
    target instanceof Node &&
    target.parentElement
  ) {
    return target.parentElement;
  }

  return null;
};

export const registerDBlockView = (handle: DBlockViewHandle) => {
  registeredHandles.add(handle);
  handleByElement.set(handle.dom, handle);
  handleByElement.set(handle.gutterElement, handle);
  handleByElement.set(handle.contentElement, handle);

  return () => {
    registeredHandles.delete(handle);
    handleByElement.delete(handle.dom);
    handleByElement.delete(handle.gutterElement);
    handleByElement.delete(handle.contentElement);
  };
};

export const getDBlockViewFromElement = (
  element: Element | null,
): DBlockViewHandle | null => {
  if (!element) {
    return null;
  }

  const registeredElement = element.closest(
    '[data-dblock-node-view], [data-dblock-gutter], [data-dblock-content-shell]',
  );

  return registeredElement
    ? (handleByElement.get(registeredElement) ?? null)
    : null;
};

export const getDBlockViewFromEventTarget = (
  target: EventTarget | null,
): DBlockViewHandle | null =>
  getDBlockViewFromElement(getElementFromTarget(target));

export const refreshRegisteredDBlockViews = () => {
  registeredHandles.forEach((handle) => {
    if (handle.dom.isConnected) {
      handle.refresh();
    }
  });
};
