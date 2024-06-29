/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';

import imagePlaceholder from '../../../assets/image_gray.svg';

const uploadKey = new PluginKey('upload-image');

const UploadImagesPlugin = () =>
  new Plugin({
    key: uploadKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, set) {
        set = set.map(tr.mapping, tr.doc);
        // See if the transaction adds or removes any placeholders
        // @ts-ignore
        const action = tr.getMeta(this);
        if (action && action.add) {
          const { id, pos, src } = action.add;

          const placeholder = document.createElement('div');
          placeholder.setAttribute('class', 'img-placeholder');
          const image = document.createElement('img');
          image.setAttribute('class', 'rounded-lg border border-stone-200');
          image.src = src;
          placeholder.appendChild(image);
          const deco = Decoration.widget(pos + 1, placeholder, {
            id
          });
          set = set.add(tr.doc, [deco]);
        } else if (action && action.remove) {
          set = set.remove(
            set.find(
              undefined,
              undefined,
              (spec: any) => spec.id == action.remove.id
            )
          );
        }
        return set;
      }
    },
    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });

export default UploadImagesPlugin;

function findPlaceholder(state: EditorState, id: any) {
  const decos = uploadKey.getState(state);
  const found = decos.find(null, null, (spec: any) => spec.id == id);
  return found.length ? found[0].from : null;
}

export function startImageUpload(
  file: File,
  view: EditorView,
  pos: number,
  handleImageUpload: (file: File) => Promise<string>
) {
  // check if the file is an image
  if (!file.type.includes('image/')) {
    console.log('file is not an image');
    return;
  }

  // A fresh object to act as the ID for this upload
  const id = {};

  // Replace the selection with a placeholder
  const tr = view.state.tr;
  if (!tr.selection.empty) tr.deleteSelection();

  tr.setMeta(uploadKey, {
    add: {
      id,
      pos,
      src: imagePlaceholder
    }
  });
  view.dispatch(tr);

  handleImageUpload(file).then(src => {
    const { schema } = view.state;

    const pos = findPlaceholder(view.state, id);
    // If the content around the placeholder has been deleted, drop the image
    if (pos == null) return;

    const imageSrc = src;

    const node = schema.nodes.resizableMedia.create({
      src: imageSrc,
      'media-type': 'img'
    });
    const transaction = view.state.tr
      .replaceWith(pos - 2, pos + node.nodeSize, node)
      .setMeta(uploadKey, { remove: { id } });
    view.dispatch(transaction);
  });
}

export const uploadFn = async (image: File) => {
  // Read image data and create a File object, then return the string URL of the uploaded image
  const reader = new FileReader();
  reader.readAsDataURL(image);

  // check if image is too large for upload (> 1 MB), then throw error
  if (image.size > 1024 * 1024) {
    reader.abort();
    console.log('should be less than 1 mb');
    throw new Error('Image too large');
  }

  // convert image to base64
  const base64Image = await new Promise(resolve => {
    reader.onload = () => {
      resolve(reader.result as string);
    };
  });
  return base64Image as string;
};
