/* eslint-disable @typescript-eslint/no-explicit-any */
import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { getResizableMediaNodeView } from './resizable-media-node-view';
import { getMediaPasteDropPlugin } from './media-paste-drop-plugin';
import UploadImagesPlugin from '../../utils/upload-images';
import { InlineLoaderPlugin } from '../../utils/inline-loader';
import { IpfsImageFetchPayload, IpfsImageUploadResponse } from '../../types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableMedia: {
      /**
       * Set media
       */
      setMedia: (options: {
        'media-type': 'img' | 'video';
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        height?: string;
      }) => ReturnType;
    };
  }
}

export interface MediaOptions {
  // inline: boolean, // we have floating support, so block is good enough
  // allowBase64: boolean, // we're not going to allow this
  HTMLAttributes: Record<string, any>;
  onError: (error: string) => void;
  ipfsImageUploadFn: (file: File) => Promise<IpfsImageUploadResponse>;
  ipfsImageFetchFn: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>;
}

export const IMAGE_INPUT_REGEX =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const VIDEO_INPUT_REGEX =
  /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export const ResizableMedia = Node.create<MediaOptions>({
  name: 'resizableMedia',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'rounded-lg border color-border-default',
      },
      ipfsImageUploadFn: async () => {
        return {
          encryptionKey: '',
          nonce: '',
          ipfsUrl: '',
          ipfsHash: '',
          authTag: '',
        };
      },
      ipfsImageFetchFn: async () => {
        return { url: '', file: new File([], '') };
      },
      onError: () => {
        console.error('Error uploading media');
      },
    };
  },

  inline: false,

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      'media-type': {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: 'auto',
      },
      dataAlign: {
        default: 'center', // 'left' | 'center' | 'right'
      },
      dataFloat: {
        default: null, // 'left' | 'right'
      },
      ipfsHash: { default: null },
      mimeType: { default: null },
      encryptionKey: { default: null },
      ipfsUrl: { default: null },
      nonce: { default: null },
      version: { default: null },
      encryptedKey: { default: null },
      url: { default: null },
      iv: { default: null },
      privateKey: { default: null },
      authTag: { default: null },
      caption: { default: null },
      showCaptionInput: { default: false },
      // TODO: For figure caption later
      // caption: {
      //   default: null,
      // },
    };
  },

  selectable: true,

  parseHTML() {
    return [
      {
        tag: 'img',
        getAttrs: (el) => ({
          src: (el as HTMLImageElement).getAttribute('src'),
          'media-type': 'img',
        }),
      },
      {
        tag: 'video',
        getAttrs: (el) => ({
          src: (el as HTMLVideoElement).getAttribute('src'),
          'media-type': 'video',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { 'media-type': mediaType } = HTMLAttributes;

    if (mediaType === 'img') {
      return [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ];
    }
    if (mediaType === 'secure-img') {
      return [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ];
    }
    if (mediaType === 'video') {
      return [
        'video',
        { controls: 'true', style: 'width: 100%', ...HTMLAttributes },
        ['source', HTMLAttributes],
      ];
    }

    if (!mediaType)
      console.error(
        'TiptapMediaExtension-renderHTML method: Media Type not set, going default with image',
      );

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      setMedia:
        (options) =>
        ({ commands }) => {
          const { 'media-type': mediaType } = options;

          if (mediaType === 'img') {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          }
          if (mediaType === 'video') {
            return commands.insertContent({
              type: this.name,
              attrs: {
                ...options,
                controls: 'true',
              },
            });
          }

          if (!mediaType)
            console.error(
              'TiptapMediaExtension-setMedia: Media Type not set, going default with image',
            );

          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      getResizableMediaNodeView(this.options.ipfsImageFetchFn),
    );
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;

        if (selection.empty) {
          return false;
        }

        const pos = selection.$to.pos;

        return editor.commands.insertContentAt(pos, {
          type: 'dBlock',
          content: [
            {
              type: 'paragraph',
            },
          ],
        });
      },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: IMAGE_INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;

          return {
            src,
            alt,
            title,
            'media-type': 'img',
          };
        },
      }),
      nodeInputRule({
        find: VIDEO_INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const [, , src] = match;

          return {
            src,
            'media-type': 'video',
          };
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      getMediaPasteDropPlugin(
        this.options.onError,
        this.options.ipfsImageUploadFn,
      ),
      UploadImagesPlugin(),
      InlineLoaderPlugin(),
    ];
  },
});
