import { Editor } from '@tiptap/core';
import { PluginKey, Plugin } from '@tiptap/pm/state';
import uuid from 'react-uuid';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const inlineUiKey = new PluginKey('inline-ui');

// Global queue to manage floating loaders
const floatingLoaderQueue: HTMLDivElement[] = [];

export const InlineLoaderPlugin = () =>
  new Plugin({
    key: inlineUiKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, set) {
        set = set.map(tr.mapping, tr.doc);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const action = tr.getMeta(this);
        if (action && action.add) {
          const { id, pos, content } = action.add;

          const placeholder = document.createElement('div');
          placeholder.setAttribute('class', 'img-placeholder');
          placeholder.textContent = content;

          const deco = Decoration.widget(pos + 1, placeholder, {
            id,
          });
          set = set.add(tr.doc, [deco]);
        } else if (action && action.remove) {
          set = set.remove(
            set.find(
              undefined,
              undefined,
              (spec) => spec.id == action.remove.id,
            ),
          );
        }
        return set;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });

export const showInlineLoadingUI = (
  editor: Editor,
  id: string,
  text: string,
) => {
  const tr = editor.view.state.tr;

  const pos = editor.view.state.selection.from;
  const sel = editor.view.state.selection;

  let floatingDiv: null | HTMLDivElement = null;

  // check if editor is unfocused
  if (!pos || (sel.empty && pos === 2)) {
    floatingDiv = document.createElement('div');
    floatingDiv.textContent = text;

    // Calculate position based on existing loaders in queue
    const queueIndex = floatingLoaderQueue.length;
    const offsetY = queueIndex * 60; // 60px spacing between loaders

    floatingDiv.className =
      'py-2 px-4 animate-pulse bg-black text-white text-sm font-medium rounded text-center w-fit mx-auto z-[999] left-0 right-0 absolute transition-all';

    // Position the loader with offset
    floatingDiv.style.bottom = `${30 + offsetY}px`;
    floatingDiv.style.transform = 'translateY(-1px)';

    // Add to queue and DOM
    floatingLoaderQueue.push(floatingDiv);
    document.body.appendChild(floatingDiv);

    return floatingDiv;
  }
  tr.setMeta(inlineUiKey, {
    add: {
      id,
      pos,
      content: text,
    },
  });
  editor.view.dispatch(tr);
};

export const removeInlineUI = (
  editor: Editor,
  id: string,
  floatingDiv?: HTMLDivElement,
) => {
  if (floatingDiv) {
    // Remove from queue
    const index = floatingLoaderQueue.indexOf(floatingDiv);
    if (index > -1) {
      floatingLoaderQueue.splice(index, 1);
    }

    // Remove from DOM
    floatingDiv.remove();

    // Reposition remaining loaders
    repositionFloatingLoaders();
    return;
  }
  const tr = editor.view.state.tr;

  tr.setMeta(inlineUiKey, {
    remove: {
      id,
    },
  });

  editor.view.dispatch(tr);
};

// Helper function to reposition floating loaders after removal
const repositionFloatingLoaders = () => {
  floatingLoaderQueue.forEach((loader, index) => {
    const offsetY = index * 60;
    loader.style.bottom = `${30 + offsetY}px`;
  });
};

export const inlineLoader = (editor: Editor, text: string) => {
  const id = uuid();
  const showLoader = () => {
    return showInlineLoadingUI(editor, id, text);
  };

  const removeLoader = (div?: HTMLDivElement) => {
    return removeInlineUI(editor, id, div);
  };

  return {
    showLoader,
    removeLoader,
    id,
  };
};

// Utility functions for managing multiple loaders
export const clearAllFloatingLoaders = () => {
  floatingLoaderQueue.forEach((loader) => loader.remove());
  floatingLoaderQueue.length = 0;
};

export const getActiveLoaderCount = () => {
  return floatingLoaderQueue.length;
};

export const updateLoaderText = (
  floatingDiv: HTMLDivElement,
  newText: string,
) => {
  if (floatingDiv && floatingLoaderQueue.includes(floatingDiv)) {
    floatingDiv.textContent = newText;
  }
};
