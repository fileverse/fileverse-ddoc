const SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'];

const isScrollableContainer = (element: HTMLElement) => {
  const { overflow, overflowX, overflowY } = window.getComputedStyle(element);

  return (
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth ||
    SCROLLABLE_OVERFLOW_VALUES.includes(overflow) ||
    SCROLLABLE_OVERFLOW_VALUES.includes(overflowX) ||
    SCROLLABLE_OVERFLOW_VALUES.includes(overflowY)
  );
};

export const getEditorScrollContainer = ({
  targetElement,
  editorRoot,
}: {
  targetElement: HTMLElement;
  editorRoot?: HTMLElement | null;
}) => {
  const possibleContainers = [
    targetElement.closest<HTMLElement>('#editor-wrapper'),
    document.getElementById('editor-wrapper'),
    targetElement.closest<HTMLElement>('#editor-canvas'),
    document.getElementById('editor-canvas'),
    targetElement.closest<HTMLElement>('.ProseMirror'),
    editorRoot ?? null,
    document.querySelector<HTMLElement>('.ProseMirror'),
    targetElement.closest<HTMLElement>('[class*="editor"]'),
    editorRoot?.parentElement ?? null,
  ].filter((element): element is HTMLElement => element !== null);

  return (
    Array.from(new Set(possibleContainers)).find(isScrollableContainer) ?? null
  );
};

export default getEditorScrollContainer;
