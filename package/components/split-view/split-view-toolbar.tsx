import { EditorView } from '@codemirror/view';
import { IconButton, Tooltip, LucideIconProps } from '@fileverse/ui';
import {
  mdCommands,
  insertSecureImage,
  insertEmbeddedImage,
} from './markdown-commands';
import { IpfsImageUploadResponse } from '../../types';

interface SplitViewToolbarProps {
  /** The CodeMirror view of the markdown pane (null until it mounts). */
  view: EditorView | null;
  /** Exit Split View (back to the normal editor). */
  onExit?: () => void;
  /** Same uploader the editor uses — for the Image button. */
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onError?: (error: string) => void;
}

type Action = {
  icon: LucideIconProps['name'];
  label: string;
  run: (view: EditorView) => void;
  /** Image button → real file-picker + IPFS upload instead of a text command. */
  upload?: boolean;
};

// A dedicated, HackMD-style markdown toolbar. Every button is natively a
// markdown command on the CodeMirror pane — no bridge, no ProseMirror.
const GROUPS: Action[][] = [
  [
    { icon: 'Undo', label: 'Undo', run: (v) => mdCommands.undo(v) },
    { icon: 'Redo', label: 'Redo', run: (v) => mdCommands.redo(v) },
  ],
  [
    { icon: 'Heading1', label: 'Heading 1', run: (v) => mdCommands.heading(v, 1) },
    { icon: 'Heading2', label: 'Heading 2', run: (v) => mdCommands.heading(v, 2) },
    { icon: 'Heading3', label: 'Heading 3', run: (v) => mdCommands.heading(v, 3) },
  ],
  [
    { icon: 'Bold', label: 'Bold', run: (v) => mdCommands.bold(v) },
    { icon: 'Italic', label: 'Italic', run: (v) => mdCommands.italic(v) },
    { icon: 'Underline', label: 'Underline', run: (v) => mdCommands.underline(v) },
    { icon: 'Strikethrough', label: 'Strikethrough', run: (v) => mdCommands.strike(v) },
    { icon: 'Code', label: 'Inline code', run: (v) => mdCommands.inlineCode(v) },
    { icon: 'Highlighter', label: 'Highlight', run: (v) => mdCommands.highlight(v) },
  ],
  [
    { icon: 'List', label: 'Bullet list', run: (v) => mdCommands.bulletList(v) },
    { icon: 'ListOrdered', label: 'Numbered list', run: (v) => mdCommands.orderedList(v) },
    { icon: 'ListChecks', label: 'To-do list', run: (v) => mdCommands.taskList(v) },
    { icon: 'TextQuote', label: 'Quote', run: (v) => mdCommands.blockquote(v) },
  ],
  [
    // HackMD-style: inserts [text](url) inline and selects `url` to type over.
    { icon: 'Link', label: 'Link', run: (v) => mdCommands.link(v) },
    { icon: 'Image', label: 'Image', run: () => {}, upload: true },
    { icon: 'Braces', label: 'Code block', run: (v) => mdCommands.codeBlock(v) },
    { icon: 'Table', label: 'Table', run: (v) => mdCommands.table(v) },
    { icon: 'Minus', label: 'Divider', run: (v) => mdCommands.horizontalRule(v) },
  ],
];

export default function SplitViewToolbar({
  view,
  onExit,
  ipfsImageUploadFn,
  onError,
}: SplitViewToolbarProps) {
  // Mirrors the editor's startImageUpload: file-picker → upload to IPFS
  // (secure-img) when an uploader is configured, else embed base64 (media-type
  // img), so the demo (no uploader) still shows the image.
  const handleImageUpload = (editorView: EditorView) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !file.type.includes('image/')) return;
      try {
        if (ipfsImageUploadFn) {
          const res = await ipfsImageUploadFn(file);
          insertSecureImage(editorView, {
            src: URL.createObjectURL(file),
            ipfsUrl: res.ipfsUrl,
            encryptionKey: res.encryptionKey,
            nonce: res.nonce,
            ipfsHash: res.ipfsHash,
            authTag: res.authTag,
            mimeType: file.type,
          });
        } else {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          insertEmbeddedImage(editorView, dataUrl);
        }
      } catch {
        onError?.('Failed to upload image');
      }
    };
    input.click();
  };

  const onAction = (action: Action, editorView: EditorView) => {
    if (action.upload) {
      handleImageUpload(editorView);
      return;
    }
    action.run(editorView);
  };

  return (
    <div className="flex items-center px-2 py-1 border-b color-border-default shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {GROUPS.map((group, groupIndex) => (
          <div key={group[0].label} className="flex items-center gap-0.5">
            {groupIndex > 0 && (
              <div className="w-[1px] h-4 vertical-divider mx-1" />
            )}
            {group.map((action) => (
              <Tooltip key={action.label} text={action.label}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={action.icon}
                  disabled={!view}
                  onClick={() => view && onAction(action, view)}
                />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>

      {onExit && (
        <div className="flex items-center pl-1 shrink-0">
          <div className="w-[1px] h-4 vertical-divider mx-1" />
          <Tooltip text="Back to editor">
            <IconButton
              variant="ghost"
              size="sm"
              icon="PenLine"
              onClick={onExit}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
