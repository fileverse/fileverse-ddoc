const SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'];
const EDITOR_SCROLL_CONTAINER_SELECTOR =
  '[data-editor-scroll-container="true"]';

const hasScrollableOverflow = (element: HTMLElement) => {
  const { overflow, overflowY } = window.getComputedStyle(element);

  return (
    SCROLLABLE_OVERFLOW_VALUES.includes(overflow) ||
    SCROLLABLE_OVERFLOW_VALUES.includes(overflowY)
  );
};

const canScrollVertically = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight > 1;

const getAncestorChain = (element: HTMLElement | null | undefined) => {
  const ancestors: HTMLElement[] = [];
  let current = element;

  while (current) {
    ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
};

export const getEditorScrollContainer = ({
  targetElement,
  editorRoot,
}: {
  targetElement: HTMLElement;
  editorRoot?: HTMLElement | null;
}) => {
  const explicitScrollContainer =
    targetElement.closest<HTMLElement>(EDITOR_SCROLL_CONTAINER_SELECTOR) ??
    editorRoot?.closest<HTMLElement>(EDITOR_SCROLL_CONTAINER_SELECTOR) ??
    document.querySelector<HTMLElement>(EDITOR_SCROLL_CONTAINER_SELECTOR);

  if (explicitScrollContainer && explicitScrollContainer.clientHeight > 0) {
    return explicitScrollContainer;
  }

  const possibleContainers = Array.from(
    new Set([
      ...getAncestorChain(targetElement),
      ...getAncestorChain(editorRoot ?? null),
      document.getElementById('editor-wrapper'),
      document.getElementById('editor-canvas'),
      document.scrollingElement instanceof HTMLElement
        ? document.scrollingElement
        : null,
    ]),
  ).filter((element): element is HTMLElement => element !== null);

  return (
    possibleContainers.find(canScrollVertically) ??
    possibleContainers.find(
      (element) => hasScrollableOverflow(element) && element.clientHeight > 0,
    ) ??
    null
  );
};

export default getEditorScrollContainer;
