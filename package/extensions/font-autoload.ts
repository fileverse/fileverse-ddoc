import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { ensureLoaded } from '../utils/font-loader';

const fontAutoloadKey = new PluginKey('fontAutoload');

const ensureFontsForDoc = (doc: PMNode): void => {
  doc.descendants((node) => {
    if (node.attrs?.fontFamily) void ensureLoaded(node.attrs.fontFamily);
    for (const mark of node.marks) {
      if (mark.type.name === 'textStyle' && mark.attrs?.fontFamily) {
        void ensureLoaded(mark.attrs.fontFamily);
      }
    }
    return true;
  });
};

export const FontAutoload = Extension.create({
  name: 'fontAutoload',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: fontAutoloadKey,
        view: (view) => {
          ensureFontsForDoc(view.state.doc);
          let prevDoc = view.state.doc;
          return {
            update: (view) => {
              if (view.state.doc === prevDoc) return;
              prevDoc = view.state.doc;
              ensureFontsForDoc(view.state.doc);
            },
          };
        },
      }),
    ];
  },
});
