import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import {
  IconButton,
  Tooltip,
  DynamicDropdown,
  LucideIconProps,
} from '@fileverse/ui';
import {
  mdCommands,
  insertSecureImage,
  insertEmbeddedImage,
} from './markdown-commands';
import { IpfsImageUploadResponse } from '../../types';

interface SplitViewToolbarProps {
  /** The CodeMirror view of the markdown pane (null until it mounts). */
  view: EditorView | null;
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

// A dedicated markdown toolbar. Every button is natively a
// markdown command on the CodeMirror pane — no bridge, no ProseMirror.
const GROUPS: Action[][] = [
  [
    { icon: 'Undo', label: 'Undo', run: (v) => mdCommands.undo(v) },
    { icon: 'Redo', label: 'Redo', run: (v) => mdCommands.redo(v) },
  ],
  [
    {
      icon: 'Heading1',
      label: 'Heading 1',
      run: (v) => mdCommands.heading(v, 1),
    },
    {
      icon: 'Heading2',
      label: 'Heading 2',
      run: (v) => mdCommands.heading(v, 2),
    },
    {
      icon: 'Heading3',
      label: 'Heading 3',
      run: (v) => mdCommands.heading(v, 3),
    },
  ],
  [
    { icon: 'Bold', label: 'Bold', run: (v) => mdCommands.bold(v) },
    { icon: 'Italic', label: 'Italic', run: (v) => mdCommands.italic(v) },
    {
      icon: 'Underline',
      label: 'Underline',
      run: (v) => mdCommands.underline(v),
    },
    {
      icon: 'Strikethrough',
      label: 'Strikethrough',
      run: (v) => mdCommands.strike(v),
    },
    {
      icon: 'Code',
      label: 'Inline code',
      run: (v) => mdCommands.inlineCode(v),
    },
    {
      icon: 'Highlighter',
      label: 'Highlight',
      run: (v) => mdCommands.highlight(v),
    },
  ],
  [
    {
      icon: 'List',
      label: 'Bullet list',
      run: (v) => mdCommands.bulletList(v),
    },
    {
      icon: 'ListOrdered',
      label: 'Numbered list',
      run: (v) => mdCommands.orderedList(v),
    },
    {
      icon: 'ListChecks',
      label: 'To-do list',
      run: (v) => mdCommands.taskList(v),
    },
    { icon: 'TextQuote', label: 'Quote', run: (v) => mdCommands.blockquote(v) },
  ],
  [
    // Inserts [text](url) inline and selects `url` to type over.
    { icon: 'Link', label: 'Link', run: (v) => mdCommands.link(v) },
    { icon: 'Image', label: 'Image', run: () => {}, upload: true },
    {
      icon: 'Braces',
      label: 'Code block',
      run: (v) => mdCommands.codeBlock(v),
    },
    { icon: 'Table', label: 'Table', run: (v) => mdCommands.table(v) },
    {
      icon: 'Minus',
      label: 'Divider',
      run: (v) => mdCommands.horizontalRule(v),
    },
  ],
];

// Groups 0–2 (undo/redo, headings, inline formatting) always stay inline; the
// rest (lists, insert) collapse into the ⋯ menu when the pane is too narrow.
const CORE_GROUP_COUNT = 3;
const CORE_GROUPS = GROUPS.slice(0, CORE_GROUP_COUNT);
const OVERFLOW_GROUPS = GROUPS.slice(CORE_GROUP_COUNT);

// Compact buttons (icon unchanged, smaller container) per the design.
const BTN_CLASS = '!h-6 !w-6 !min-w-0';

// Below this available toolbar width, the overflow groups move into the ⋯ menu
// (matches the Figma small-pane layout). Tunable.
const COLLAPSE_BELOW_PX = 560;

const Divider = () => <div className="w-[1px] h-4 vertical-divider mx-1" />;

export default function SplitViewToolbar({
  view,
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

  // Collapse the overflow groups into the ⋯ menu when the toolbar is too narrow.
  const groupsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = groupsRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setCollapsed(el.clientWidth < COLLAPSE_BELOW_PX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderButton = (action: Action) => (
    <Tooltip key={action.label} text={action.label}>
      <IconButton
        variant="ghost"
        size="sm"
        className={BTN_CLASS}
        icon={action.icon}
        disabled={!view}
        onClick={() => view && onAction(action, view)}
      />
    </Tooltip>
  );

  const renderGroup = (group: Action[], withDivider: boolean) => (
    <div key={group[0].label} className="flex items-center gap-0.5">
      {withDivider && <Divider />}
      {group.map(renderButton)}
    </div>
  );

  return (
    <div className="flex items-center px-2 py-2 border-b color-border-default shrink-0">
      <div
        ref={groupsRef}
        className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden"
      >
        {CORE_GROUPS.map((group, i) => renderGroup(group, i > 0))}

        {collapsed ? (
          <div className="flex items-center gap-0.5">
            <Divider />
            <DynamicDropdown
              key="md-more-dropdown"
              align="start"
              sideOffset={8}
              anchorTrigger={
                <Tooltip text="More">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    className={BTN_CLASS}
                    icon="Ellipsis"
                    disabled={!view}
                  />
                </Tooltip>
              }
              content={
                <div className="flex items-center gap-0.5 p-1">
                  {OVERFLOW_GROUPS.flat().map(renderButton)}
                </div>
              }
            />
          </div>
        ) : (
          OVERFLOW_GROUPS.map((group) => renderGroup(group, true))
        )}
      </div>
    </div>
  );
}
