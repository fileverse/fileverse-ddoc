/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';

import imagePlaceholder from '../assets/spinner_GIF.gif';
import { ERR_MSG_MAP, MAX_IMAGE_SIZE } from '../components/editor-utils';
import {
  arrayBufferToBase64,
  generateRSAKeyPair,
} from './security';

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
            id,
          });
          set = set.add(tr.doc, [deco]);
        } else if (action && action.remove) {
          set = set.remove(
            set.find(
              undefined,
              undefined,
              (spec: any) => spec.id == action.remove.id,
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

export default UploadImagesPlugin;

function findPlaceholder(state: EditorState, id: any) {
  const decos = uploadKey.getState(state);
  const found = decos.find(null, null, (spec: any) => spec.id == id);
  return found.length ? found[0].from : null;
}

export async function startImageUpload(file: File, view: EditorView, pos: number, secureImageUploadUrl?: string) {
  try {
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
        src: imagePlaceholder,
      },
    });
    view.dispatch(tr);

    const {schema} = view.state;
    const placeholder = findPlaceholder(view.state, id);
    if (!placeholder) return;

    if (secureImageUploadUrl) {
      const {publicKey, privateKey} = await generateRSAKeyPair();
      const {key, url, iv} = await uploadSecureImage(secureImageUploadUrl, file, publicKey);

      const node = schema.nodes.resizableMedia.create({
        encryptedKey: key,
        url,
        iv,
        privateKey,
        'media-type': 'secure-img',
      });

      const transaction = view.state.tr
        .replaceWith(pos - 2, pos + node.nodeSize, node)
        .setMeta(uploadKey, {remove: {id}});
      view.dispatch(transaction);
    } else {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onloadend = () => {
        const {schema} = view.state;
        const pos = findPlaceholder(view.state, id);
        if (!pos) return;
        const src = fileReader.result as string;
        const node = schema.nodes.resizableMedia.create({
          src: src,
          'media-type': 'img',
        });
        const transaction = view.state.tr
          .replaceWith(pos - 2, pos + node.nodeSize, node)
          .setMeta(uploadKey, {remove: {id}});
        view.dispatch(transaction);
      }
    }
  } catch (error) {
    console.error('Error during image upload: ', error)
  }
}

export const uploadFn = async (image: File) => {
  // Read image data and create a File object, then return the string URL of the uploaded image
  const reader = new FileReader();
  reader.readAsDataURL(image);

  // check if image is too large for upload (> 1 MB), then throw error
  if (image.size > MAX_IMAGE_SIZE) {
    reader.abort();
    throw new Error(ERR_MSG_MAP.IMAGE_SIZE);
  }

  // convert image to base64
  const base64Image = await new Promise((resolve) => {
    reader.onload = () => {
      resolve(reader.result as string);
    };
  });
  return base64Image as string;
};


export const uploadSecureImage = async (url: string, image: File, publicKey: ArrayBuffer) => {
  try {
    const publicKeyBase64 = arrayBufferToBase64(publicKey);
    const formData = new FormData();

    formData.append('file', image);
    formData.append('publicKey', publicKeyBase64);

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response?.ok) {
      console.error('Failed to upload file', response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('Error during image upload: ', error)
  }
}