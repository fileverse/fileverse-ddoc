import { Plugin, PluginKey } from 'prosemirror-state';
import { ERR_MSG_MAP, MAX_IMAGE_SIZE } from '../../../components/editor-utils';

export type UploadFnType = (image: File) => Promise<string>;

/**
 * This function creates a Prosemirror plugin that handles pasting and dropping of media files.
 * It accepts an upload function as a parameter which is used to upload the media files.
 * The plugin prevents the default paste and drop event, uploads the media file (if an upload function is provided),
 * creates a new node with the uploaded media file and replaces the current selection with the new node.
 * If no upload function is provided, it reads the media file as DataURL and uses this in the new node.
 * The function returns a new instance of the Plugin.
 */
export const getMediaPasteDropPlugin = (
  upload: UploadFnType,
  // onError: (error: string) => void,
) => {
  return new Plugin({
    key: new PluginKey('media-paste-drop'),
    props: {
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items || []);

        items.forEach(item => {
          const file = item.getAsFile();

          const isImageOrVideo =
            file?.type.indexOf('image') === 0 ||
            file?.type.indexOf('video') === 0;

          if (isImageOrVideo) {
            event.preventDefault();

            if (file) {
              // Check if the image size is less than 100Kb
              if (file.size > MAX_IMAGE_SIZE) {
                // onError(ERR_MSG_MAP.IMAGE_SIZE);
                throw new Error(ERR_MSG_MAP.IMAGE_SIZE);
              }
            }
          }
        });

        return false;
      },
      handleDrop(view, event) {
        const hasFiles =
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length;

        if (!hasFiles) {
          return false;
        }

        const imagesAndVideos = Array.from(
          event.dataTransfer?.files ?? [],
        ).filter(({ type: t }) => /image|video/i.test(t));

        if (imagesAndVideos.length === 0) return false;

        event.preventDefault();

        const { schema } = view.state;

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        if (!coordinates) return false;

        imagesAndVideos.forEach(async imageOrVideo => {
          const reader = new FileReader();

          if (upload) {
            try {
              const uploadedSrc = await upload(imageOrVideo);
              const node = schema.nodes.resizableMedia.create({
                src: uploadedSrc,
                'media-type': imageOrVideo.type.includes('image')
                  ? 'img'
                  : 'video',
              });

              const transaction = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(transaction);
            } catch (error) {
              onError((error as Error).message || 'Error uploading media');
            }
          } else {
            reader.onload = readerEvent => {
              const node = schema.nodes.resizableMedia.create({
                src: readerEvent.target?.result,

                'media-type': imageOrVideo.type.includes('image')
                  ? 'img'
                  : 'video',
              });

              const transaction = view.state.tr.insert(coordinates.pos, node);

              view.dispatch(transaction);
            };

            reader.readAsDataURL(imageOrVideo);
          }
        });

        return true;
      },
    },
  });
};
