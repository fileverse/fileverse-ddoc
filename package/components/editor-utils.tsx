/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { IEditorTool, useEditorToolVisiibility } from '../hooks/use-visibility';
import { Editor } from '@tiptap/react';
import { startImageUpload } from '../utils/upload-images';
import cn from 'classnames';
import UtilsModal from './utils-modal';
import {
  Carousel,
  CarouselContent,
  CarouselIndicator,
  CarouselItem,
} from '../common/carousel';
import {
  Button,
  IconButton,
  LucideIcon,
  TextAreaFieldV2,
  TextField,
  Tooltip,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import { colors } from '../utils/colors';

interface IEditorToolElement {
  icon: any;
  title: string;
  onClick: () => void;
  isActive: boolean;
}

export const fonts = [
  {
    title: 'Trebuchet MS',
    value: 'Trebuchet MS, sans-serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Trebuchet MS, sans-serif').run();
    },
  },
  {
    title: 'Verdana',
    value: 'Verdana, Geneva, sans-serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Verdana, Geneva, sans-serif').run();
    },
  },
  {
    title: 'Georgia',
    value: 'Georgia, serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Georgia, serif').run();
    },
  },
  {
    title: 'Arial',
    value: 'Arial, Helvetica, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Arial, Helvetica, sans-serif')
        .run();
    },
  },
  {
    title: 'Comic Sans MS',
    value: 'Comic Sans MS, Comic Sans',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Comic Sans MS, Comic Sans').run();
    },
  },
  {
    title: 'Impact',
    value: 'Impact, Charcoal, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Impact, Charcoal, sans-serif')
        .run();
    },
  },
  {
    title: 'Palatino',
    value: 'Palatino Linotype, Book Antiqua, Palatino, serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Palatino Linotype, Book Antiqua, Palatino, serif')
        .run();
    },
  },
  {
    title: 'Lucida Grande',
    value: 'Lucida Sans Unicode, Lucida Grande, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Lucida Sans Unicode, Lucida Grande, sans-serif')
        .run();
    },
  },
  {
    title: 'Serif',
    value: 'serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('serif').run();
    },
  },
  {
    title: 'Monospace',
    value: 'monospace',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('monospace').run();
    },
  },
  {
    title: 'Cursive',
    value: 'cursive',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('cursive').run();
    },
  },
];

export const ERR_MSG_MAP = {
  IMAGE_SIZE: 'Image size should be less than 10MB',
};

export const IMG_UPLOAD_SETTINGS = {
  Extended: {
    maxSize: 1024 * 1024 * 10,
    errorMsg: 'Image size should be less than 10MB',
  },
  Base: {
    maxSize: 1024 * 100,
    errorMsg: 'Image size should be less than 100kb',
  },
};

export const useEditorToolbar = ({
  editor,
  onError,
  secureImageUploadUrl,
  onMarkdownExport,
  onMarkdownImport,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
  secureImageUploadUrl?: string;
  onMarkdownExport?: () => void;
  onMarkdownImport?: () => void;
}) => {
  const {
    ref: toolRef,
    toolVisibility,
    setToolVisibility,
  } = useEditorToolVisiibility(IEditorTool.NONE);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const undoRedoTools: Array<IEditorToolElement | null> = [
    {
      icon: 'Undo',
      title: 'Undo',
      onClick: () => {
        editor?.chain().undo().run();
      },
      isActive: editor?.can().undo(),
    },
    {
      icon: 'Redo',
      title: 'Redo',
      onClick: () => {
        editor?.chain().redo().run();
      },
      isActive: editor?.can().redo(),
    },
    null,
  ];
  const toolbar: Array<IEditorToolElement | null> = [
    {
      icon: 'Baseline',
      title: 'Text Color',
      onClick: () => setToolVisibility(IEditorTool.TEXT_COLOR),
      isActive: toolVisibility === IEditorTool.TEXT_COLOR,
    },
    {
      icon: 'Highlighter',
      title: 'Highlight',
      onClick: () => setToolVisibility(IEditorTool.HIGHLIGHT),
      isActive: toolVisibility === IEditorTool.HIGHLIGHT,
    },
    null,
    {
      icon: 'Bold',
      title: 'Bold',
      onClick: () => editor?.chain().focus().toggleBold().run(),
      isActive: editor?.isActive('bold'),
    },
    {
      icon: 'Italic',
      title: 'Italic',
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      isActive: editor?.isActive('italic'),
    },
    {
      icon: 'Underline',
      title: 'Underlined',
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: editor?.isActive('underline'),
    },
    {
      icon: 'Strikethrough',
      title: 'Strikethrough',
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      isActive: editor?.isActive('strike'),
    },
    null,
    {
      icon: 'List',
      title: 'List',
      onClick: () => {
        editor?.chain().focus().toggleBulletList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('bulletList'),
    },
    {
      icon: 'ListOrdered',
      title: 'Ordered List',
      onClick: () => {
        editor?.chain().focus().toggleOrderedList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('orderedList'),
    },
    {
      icon: 'ListChecks',
      title: 'To-do List',
      onClick: () => {
        editor?.chain().focus().toggleTaskList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('taskList'),
    },
    {
      icon: 'AlignLeft',
      title: 'Alignment',
      onClick: () => setToolVisibility(IEditorTool.ALIGNMENT),
      isActive: toolVisibility === IEditorTool.ALIGNMENT,
    },
    {
      icon: 'TextQuote',
      title: 'Quote',
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      isActive: editor?.isActive('blockquote'),
    },
    null,
    {
      icon: 'Superscript',
      title: 'Superscript',
      onClick: () =>
        editor?.chain().focus().unsetSubscript().toggleSuperscript().run(),
      isActive: editor?.isActive('superscript'),
    },
    {
      icon: 'Subscript',
      title: 'Subscript',
      onClick: () =>
        editor?.chain().focus().unsetSuperscript().toggleSubscript().run(),
      isActive: editor?.isActive('subscript'),
    },
    null,
    {
      icon: 'ImagePlus',
      title: 'Upload Image',
      onClick: () => {
        editor?.chain().focus().deleteRange(editor.state.selection).run();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            const size = file.size;
            const imgConfig = secureImageUploadUrl
              ? IMG_UPLOAD_SETTINGS.Extended
              : IMG_UPLOAD_SETTINGS.Base;
            if (size > imgConfig.maxSize) {
              if (onError && typeof onError === 'function') {
                onError(imgConfig.errorMsg);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos, secureImageUploadUrl);
          }
        };
        input.click();
      },
      isActive: false,
    },
    {
      icon: 'Link',
      title: 'Link',
      onClick: () => setToolVisibility(IEditorTool.LINK),
      isActive: editor?.isActive('link'),
    },
    {
      icon: 'Code',
      title: 'Code',
      onClick: () => editor?.chain().focus().toggleCode().run(),
      isActive: editor?.isActive('code'),
    },
    {
      icon: 'Braces',
      title: 'Code Block',
      onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      isActive: editor?.isActive('codeBlock'),
    },
    {
      icon: 'Table',
      title: 'Add table',
      onClick: () =>
        editor
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
      isActive: false,
    },
    {
      icon: 'Markdown',
      title: 'Markdown',
      onClick: () => {},
      isActive: false,
    },
  ];

  const markdownOptions: Array<IEditorToolElement | null> = [
    {
      icon: 'FileInput',
      title: 'Import Markdown',
      onClick: () => {
        editor?.commands.uploadMarkdownFile();
        onMarkdownImport?.();
      },
      isActive: false,
    },
    {
      icon: 'FileOutput',
      title: 'Export Markdown',
      onClick: () => {
        setIsExportModalOpen(true);
        onMarkdownExport?.();
      },
      isActive: false,
    },
  ];

  const bottomToolbar: Array<IEditorToolElement | null> = [
    {
      icon: 'Undo',
      title: 'Undo',
      onClick: () => {
        editor?.chain().undo().run();
      },
      isActive: editor?.can().undo(),
    },
    {
      icon: 'Redo',
      title: 'Redo',
      onClick: () => {
        editor?.chain().redo().run();
      },
      isActive: editor?.can().redo(),
    },
    null,
    {
      icon: 'Type',
      title: 'Text formating',
      onClick: () => setToolVisibility(IEditorTool.TEXT_FORMATING),
      isActive: toolVisibility === IEditorTool.TEXT_FORMATING,
    },
    null,
    {
      icon: 'Table',
      title: 'Add table',
      onClick: () =>
        editor
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
      isActive: false,
    },
    null,
    {
      icon: 'ListChecks',
      title: 'To-do list',
      onClick: () => {
        editor?.chain().focus().toggleTaskList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: false,
    },
    null,
    {
      icon: 'ImagePlus',
      title: 'Add image',
      onClick: () => {
        editor?.chain().focus().deleteRange(editor.state.selection).run();
        // upload image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            const size = file.size;

            const imgConfig = secureImageUploadUrl
              ? IMG_UPLOAD_SETTINGS.Extended
              : IMG_UPLOAD_SETTINGS.Base;

            if (size > imgConfig.maxSize) {
              if (onError && typeof onError === 'function') {
                onError(imgConfig.errorMsg);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos, secureImageUploadUrl);
          }
        };
        input.click();
      },
      isActive: false,
    },
  ];
  return {
    undoRedoTools,
    toolbar,
    markdownOptions,
    bottomToolbar,
    toolRef,
    toolVisibility,
    setToolVisibility,
    isExportModalOpen,
    setIsExportModalOpen,
  };
};

export const TextHighlighter = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto gap-0.5 flex flex-wrap max-h-[400px] w-[14.7rem] overflow-y-auto scroll-smooth rounded bg-white px-2 py-2 shadow-elevation-1 transition-all"
    >
      {colors.map((color) => (
        <div
          onClick={() => {
            editor
              .chain()
              .focus()
              .toggleHighlight({ color: color.color })
              .run();
            setVisibility(IEditorTool.NONE);
          }}
          key={color.color}
          className={cn(
            'w-5 rounded-full flex items-center justify-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-5',
            color.code,
          )}
        >
          <LucideIcon
            name="Check"
            className={cn(
              'w-[14px] aspect-square',
              editor.isActive('textStyle', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible',
            )}
          />
        </div>
      ))}

      <Button
        variant="ghost"
        onClick={() => {
          editor.chain().focus().unsetHighlight().run();
          setVisibility(IEditorTool.NONE);
        }}
        className="w-full justify-start mt-2 gap-1 !p-1 h-fit"
      >
        <LucideIcon name="Ban" className="w-[18px] aspect-square" />
        <span>None</span>
      </Button>
    </div>
  );
};
export const EditorFontFamily = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 h-auto max-h-[330px] w-48 overflow-y-auto scroll-smooth bg-white px-1 py-2 shadow-elevation-1 transition-all rounded',
      )}
    >
      {fonts.map((font) => (
        <button
          onClick={() => {
            font.command(editor);
            setToolVisibility(IEditorTool.NONE);
          }}
          key={font.title}
          style={{
            fontFamily: font.title,
          }}
          className={cn(
            'flex w-full items-center space-x-2 rounded px-2 py-1 text-left text-sm text-black transition',
            editor.isActive('textStyle', { fontFamily: font.value })
              ? 'bg-yellow-300 xl:hover:brightness-90'
              : 'hover:bg-[#f2f2f2]',
          )}
        >
          <p className="font-medium">{font.title}</p>
        </button>
      ))}
    </div>
  );
};
export const EditorAlignment = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto left-[47rem] flex flex-wrap gap-1 max-h-[330px] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-elevation-1 transition-all"
    >
      <button
        onClick={() => {
          editor?.chain().focus().setTextAlign('left').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'left' })
            ? 'bg-yellow-300 xl:hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <LucideIcon name="AlignLeft" />
      </button>
      <button
        onClick={() => {
          editor?.chain().focus().setTextAlign('center').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'center' })
            ? 'bg-yellow-300 xl:hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <LucideIcon name="AlignCenter" />
      </button>
      <button
        onClick={() => {
          editor?.chain().focus().setTextAlign('right').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'right' })
            ? 'bg-yellow-300 xl:hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <LucideIcon name="AlignRight" />
      </button>
    </div>
  );
};
export const EditorList = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 h-auto gap-2 flex flex-wrap max-h-[330px] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-elevation-1 transition-all',
      )}
    >
      <Tooltip text="unordered list">
        <button
          onClick={() => {
            editor?.chain().focus().toggleBulletList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('bulletList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <LucideIcon name="List" />
        </button>
      </Tooltip>

      <Tooltip text="ordered list">
        <button
          onClick={() => {
            editor?.chain().focus().toggleOrderedList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('orderedList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <LucideIcon name="ListOrdered" />
        </button>
      </Tooltip>

      <Tooltip text="to-do list">
        <button
          onClick={() => {
            editor?.chain().focus().toggleTaskList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('taskList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <LucideIcon name="ListChecks" />
        </button>
      </Tooltip>
    </div>
  );
};
export const LinkPopup = ({
  elementRef,
  editor,
  setToolVisibility,
  bubbleMenu,
  setIsLinkPopupOpen,
  onError,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
  bubbleMenu?: boolean;
  setIsLinkPopupOpen?: Dispatch<SetStateAction<boolean>>;
  onError?: (errorString: string) => void;
}) => {
  const [url, setUrl] = useState(editor.getAttributes('link').href);
  const apply = useCallback(() => {
    // empty
    if (url === '' || url === undefined) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Validate URL
    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?|\w+@[\w.-]+\.\w+)$/i;

    if (!urlPattern.test(url)) {
      if (onError && typeof onError === 'function') {
        onError('Invalid URL');
      }
      return;
    }

    // Add https:// prefix if it's missing
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    // Update link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: finalUrl })
      .run();

    setToolVisibility(IEditorTool.NONE);
    if (bubbleMenu && setIsLinkPopupOpen) setIsLinkPopupOpen(false);
  }, [url, editor, bubbleMenu, setIsLinkPopupOpen, onError, setToolVisibility]);
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto gap-2 items-center flex max-h-[330px] overflow-y-auto scroll-smooth rounded-lg bg-white p-2 shadow-elevation-1 transition-all"
    >
      <TextField
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setUrl(e.target.value)
        }
        className="w-full"
        placeholder="Add link here"
        value={url}
      />
      <div className="h-full flex items-center gap-2">
        <Button onClick={() => apply()} className="min-w-fit h-[36px]">
          Apply
        </Button>
        <Button
          variant="secondary"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="min-w-fit h-[36px]"
        >
          Unset
        </Button>
      </div>
    </div>
  );
};

export const InlineCommentPopup = ({
  elementRef,
  editor,
  setIsCommentSectionOpen,
  setIsInlineCommentOpen,
  inlineCommentData,
  setInlineCommentData,
  onInlineComment,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setIsCommentSectionOpen: Dispatch<SetStateAction<boolean>>;
  setIsInlineCommentOpen: Dispatch<SetStateAction<boolean>>;
  inlineCommentData: {
    highlightedTextContent: string;
    inlineCommentText: string;
    handleClick: boolean;
  };
  setInlineCommentData: (data: {
    highlightedTextContent?: string;
    inlineCommentText?: string;
    handleClick?: boolean;
  }) => void;
  onInlineComment?: () => void;
}) => {
  const [comment, setComment] = useState(
    inlineCommentData.inlineCommentText || '',
  );
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    setInlineCommentData({ inlineCommentText: value });
  };

  // Unset highlight when popup is closed without submitting
  const handleClosePopup = () => {
    editor.chain().unsetHighlight().run();
    setComment('');
    setInlineCommentData({
      inlineCommentText: '',
      highlightedTextContent: '',
      handleClick: false,
    });
    setIsInlineCommentOpen(false);
  };

  // Close popup if click is outside or ESC key is pressed
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        elementRef.current &&
        !elementRef.current.contains(event.target as Node)
      ) {
        handleClosePopup();
      }
    };
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClosePopup();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [elementRef]);

  const handleClick = () => {
    if (comment.trim()) {
      // Update comment data and highlight
      setInlineCommentData({ inlineCommentText: comment, handleClick: true });
      editor.chain().unsetHighlight().run();
      setIsCommentSectionOpen(true);
      onInlineComment?.();
      // Reset comment field and close inline comment
      setComment('');
      setIsInlineCommentOpen(false);

      // Close popup using ref
      if (elementRef.current?.parentElement) {
        // Find and close the nearest popover/dropdown container
        const popoverContent = elementRef.current.closest('[role="dialog"]');
        if (popoverContent) {
          popoverContent.remove();
        }
      }

      // Clear selection to hide bubble menu by collapsing selection to start
      const { from } = editor.state.selection;
      editor.chain().focus().setTextSelection(from).run();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleClick();
      onInlineComment?.();
    }
  };

  return (
    <div
      ref={elementRef}
      className="w-[300px] bg-[#F8F9FA] shadow-[0px_4px_16px_-4px_rgba(0,0,0,0.15)] rounded-md"
    >
      <TextAreaFieldV2
        value={comment}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="bg-[#F8F9FA] w-[296px] font-normal min-h-[44px] max-h-[196px] pt-2 border-none overflow-y-auto no-scrollbar"
        placeholder="Type your comment"
        autoFocus
      />
      {comment.trim() !== '' && (
        <div className="h-full flex items-center gap-2 p-3">
          <span className="w-full text-[12px] text-[#77818A]">
            Press{' '}
            <span className="font-semibold">{isMobile ? 'Send' : 'Enter'}</span>{' '}
            to send a comment
          </span>
          <Button className="!min-w-[10px] !h-8 !px-2" onClick={handleClick}>
            <LucideIcon name="SendHorizontal" size="md" />
          </Button>
        </div>
      )}
    </div>
  );
};

export const ScriptsPopup = ({
  elementRef,
  editor,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
}) => {
  const options = [
    {
      title: 'Superscript',
      command: () =>
        editor.chain().focus().unsetSubscript().toggleSuperscript().run(),
      isActive: () => editor.isActive('superscript'),
      icon: 'Superscript',
    },
    {
      title: 'Subscript',
      command: () =>
        editor.chain().focus().unsetSuperscript().toggleSubscript().run(),
      isActive: () => editor.isActive('subscript'),
      icon: 'Subscript',
    },
    {
      title: 'None',
      command: () =>
        editor.chain().focus().unsetSuperscript().unsetSubscript().run(),
      isActive: () =>
        !editor.isActive('superscript') && !editor.isActive('subscript'),
      icon: 'RemoveFormatting',
    },
  ];

  return (
    <div
      ref={elementRef}
      className="z-50 w-48 bg-white rounded shadow-elevation-1 p-1"
    >
      <div className="flex flex-col gap-1 justify-center w-fit sm:w-full">
        {options.map((option) => (
          <Button
            key={option.title}
            variant="ghost"
            onClick={() => {
              option.command();
            }}
            className="flex items-center justify-between w-full px-2 py-1"
          >
            <div className="flex items-center gap-2">
              <LucideIcon name={option.icon} />
              <span>{option.title}</span>
            </div>
            {option.isActive() && (
              <LucideIcon name="Check" size="sm" className="ml-2" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
export const TextColor = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto gap-0.5 flex flex-wrap max-h-[400px] w-[14.7rem] overflow-y-auto scroll-smooth rounded bg-white px-2 py-2 shadow-elevation-1 transition-all"
    >
      {colors.map((color) => (
        <div
          onClick={() => {
            editor.chain().focus().setColor(color.color).run();
            setVisibility(IEditorTool.NONE);
          }}
          key={color.color}
          className={cn(
            'w-5 rounded-full flex justify-center items-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-5',
            color.code,
          )}
        >
          <LucideIcon
            name="Check"
            className={cn(
              'w-[14px] aspect-square',
              editor.isActive('textStyle', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible',
            )}
          />
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={() => {
          editor.chain().focus().unsetColor().run();
          setVisibility(IEditorTool.NONE);
        }}
        className="w-full justify-start mt-2 gap-1 !p-1 h-fit"
      >
        <LucideIcon name="Ban" className="w-[18px] aspect-square" />
        <span>None</span>
      </Button>
    </div>
  );
};
export const TextHeading = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  const headings = [
    {
      title: 'Text',
      description: 'Normal',
      icon: 'Type',
      command: (editor: Editor) =>
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run(),
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList'),
    },
    {
      title: 'Heading 1',
      description: 'Big',
      icon: 'Heading1',
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      description: 'Medium',
      icon: 'Heading2',
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      description: 'Small',
      icon: 'Heading3',
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 flex w-48 flex-col overflow-hidden rounded bg-white p-1 shadow-elevation-1',
      )}
    >
      {headings.map((heading) => (
        <button
          onClick={() => {
            heading.command(editor);
            setVisibility(IEditorTool.NONE);
          }}
          key={heading.title}
          className={cn(
            'flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-black transition',
            {
              ['bg-yellow-300 xl:hover:brightness-90']: heading.isActive(),
              ['hover:bg-[#f2f2f2]']: !heading.isActive(),
            },
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded bg-white">
            <LucideIcon name={heading.icon} size="md" />
          </div>
          <div>
            <p className="font-medium">{heading.title}</p>
            <p className="text-xs text-stone-500"> {heading.description} </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export const TextFormatingPopup = ({
  editor,
  setToolVisibility,
}: {
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  const popupRef = useRef(null);
  const headings = [
    {
      title: 'Text',
      description: 'Normal',
      icon: 'Type',
      command: (editor: Editor) =>
        editor.chain().toggleNode('paragraph', 'paragraph').run(),
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList'),
    },
    {
      title: 'Heading 1',
      description: 'Big',
      icon: 'Heading1',
      command: (editor: Editor) => {
        editor.chain().toggleHeading({ level: 1 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      description: 'Medium',
      icon: 'Heading2',
      command: (editor: Editor) => {
        editor.chain().toggleHeading({ level: 2 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      description: 'Small',
      icon: 'Heading3',
      command: (editor: Editor) => {
        editor.chain().toggleHeading({ level: 3 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  const textAlignments = [
    {
      title: 'Left',
      description: 'Left',
      icon: 'AlignLeft',
      command: (editor: Editor) =>
        editor.chain().focus().setTextAlign('left').run(),
      isActive: () => editor.isActive({ textAlign: 'left' }),
    },
    {
      title: 'Center',
      description: 'Center',
      icon: 'AlignCenter',
      command: (editor: Editor) =>
        editor.chain().focus().setTextAlign('center').run(),
      isActive: () => editor.isActive({ textAlign: 'center' }),
    },
    {
      title: 'Right',
      description: 'Right',
      icon: 'AlignRight',
      command: (editor: Editor) =>
        editor.chain().focus().setTextAlign('right').run(),
      isActive: () => editor.isActive({ textAlign: 'right' }),
    },
  ];

  const textStyles = [
    {
      title: 'Bold',
      description: 'Bold text',
      icon: 'Bold',
      command: (editor: Editor) => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      title: 'Italic',
      description: 'Italic text',
      icon: 'Italic',
      command: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      title: 'Underline',
      description: 'Underline text',
      icon: 'Underline',
      command: (editor: Editor) =>
        editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
    },
    {
      title: 'Strikethrough',
      description: 'Strikethrough text',
      icon: 'Strikethrough',
      command: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      title: 'Superscript',
      description: 'Superscript text',
      icon: 'Superscript',
      command: (editor: Editor) =>
        editor.chain().focus().unsetSubscript().toggleSuperscript().run(),
      isActive: () => editor.isActive('superscript'),
    },
    {
      title: 'Subscript',
      description: 'Subscript text',
      icon: 'Subscript',
      command: (editor: Editor) =>
        editor.chain().focus().unsetSuperscript().toggleSubscript().run(),
      isActive: () => editor.isActive('subscript'),
    },
  ];

  const others = [
    {
      title: 'Code',
      description: 'Code',
      icon: 'Code',
      command: (editor: Editor) => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      title: 'Link',
      description: 'Link',
      icon: 'Link',
      command: () => setToolVisibility(IEditorTool.LINK_POPUP),
      isActive: () => false,
    },
    {
      title: 'Quote',
      description: 'Quote',
      icon: 'TextQuote',
      command: (editor: Editor) =>
        editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
  ];

  const listStyles = [
    {
      title: 'Bullet List',
      description: 'Bullet list',
      icon: 'List',
      command: (editor: Editor) =>
        editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      title: 'Ordered List',
      description: 'Ordered list',
      icon: 'ListOrdered',
      command: (editor: Editor) =>
        editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      title: 'Code Block',
      description: 'Code block',
      icon: 'Braces',
      command: (editor: Editor) =>
        editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
  ];

  return (
    <UtilsModal
      title="Text formating"
      ref={popupRef}
      onCloseAutoFocus={() => setToolVisibility(IEditorTool.NONE)}
      content={
        <div className="px-4 flex flex-col gap-2 w-full">
          <div className="flex justify-start sm:justify-center items-center gap-1">
            {headings.map((heading) => (
              <button
                onClick={() => heading.command(editor)}
                key={heading.title}
                className={cn(
                  'flex w-fit items-center font-medium space-x-2 rounded p-2 text-center text-sm text-black transition',
                  {
                    ['bg-yellow-300 xl:hover:brightness-90']:
                      heading.isActive(),
                    ['hover:bg-[#f2f2f2]']: !heading.isActive(),
                  },
                )}
              >
                {heading.title}
              </button>
            ))}
          </div>
          <div className="flex justify-between sm:justify-center items-center gap-1">
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly w-full sm:w-fit p-1">
              {textAlignments.map((textAlignment) => (
                <button
                  onClick={() => textAlignment.command(editor)}
                  key={textAlignment.title}
                  className={cn(
                    'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                    {
                      ['bg-yellow-300 xl:hover:brightness-90']:
                        textAlignment.isActive(),
                      ['hover:bg-[#f2f2f2]']: !textAlignment.isActive(),
                    },
                  )}
                >
                  <LucideIcon name={textAlignment.icon} size="md" />
                </button>
              ))}
            </div>
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly w-full sm:w-fit p-1">
              {others.map((other) => (
                <button
                  onClick={() => other.command(editor)}
                  key={other.title}
                  className={cn(
                    'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                    {
                      ['bg-yellow-300 xl:hover:brightness-90']:
                        other.isActive(),
                      ['hover:bg-[#f2f2f2]']: !other.isActive(),
                    },
                  )}
                >
                  <LucideIcon name={other.icon} size="md" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 justify-center">
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly p-1 w-full sm:w-fit ">
              {textStyles.slice(0, 4).map((textStyle) => (
                <button
                  onClick={() => textStyle.command(editor)}
                  key={textStyle.title}
                  className={cn(
                    'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                    {
                      ['bg-yellow-300 xl:hover:brightness-90']:
                        textStyle.isActive(),
                      ['hover:bg-[#f2f2f2]']: !textStyle.isActive(),
                    },
                  )}
                >
                  <LucideIcon name={textStyle.icon} size="md" />
                </button>
              ))}
            </div>
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly p-1 w-full sm:w-fit ">
              {textStyles.slice(4).map((textStyle) => (
                <button
                  onClick={() => textStyle.command(editor)}
                  key={textStyle.title}
                  className={cn(
                    'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                    {
                      ['bg-yellow-300 xl:hover:brightness-90']:
                        textStyle.isActive(),
                      ['hover:bg-[#f2f2f2]']: !textStyle.isActive(),
                    },
                  )}
                >
                  <LucideIcon name={textStyle.icon} size="md" />
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#f8f9fa] rounded flex gap-1 justify-center self-center w-fit p-1">
            {listStyles.map((listStyle) => (
              <button
                onClick={() => listStyle.command(editor)}
                key={listStyle.title}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 xl:hover:brightness-90']:
                      listStyle.isActive(),
                    ['hover:bg-[#f2f2f2]']: !listStyle.isActive(),
                  },
                )}
              >
                <LucideIcon name={listStyle.icon} size="md" />
              </button>
            ))}
          </div>

          {/* New Layout */}
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-left sm:text-center text-lg font-semibold leading-none tracking-tight">
              Text color
            </p>
            <Carousel
              opts={{
                align: 'start',
                dragFree: true,
                slidesToScroll: 'auto',
              }}
              className="w-full max-w-md mx-auto"
            >
              <CarouselContent>
                <CarouselItem
                  style={{
                    flexBasis: 'calc(100% / 12)',
                  }}
                >
                  <button
                    className="mb-1 drop-shadow flex justify-center items-center cursor-pointer transition"
                    onClick={() => {
                      editor.chain().unsetColor().run();
                    }}
                  >
                    <LucideIcon name="Ban" className="w-6 h-6" />
                  </button>
                </CarouselItem>
                {colors.map((color, index) => (
                  <CarouselItem
                    key={index}
                    style={{
                      flexBasis: 'calc(100% / 12)',
                    }}
                  >
                    <button
                      onClick={() => {
                        editor.chain().setColor(color.color).run();
                      }}
                      key={color.color}
                      className={cn(
                        'w-6 h-6 mb-1 drop-shadow rounded-full flex justify-center items-center cursor-pointer transition',
                        color.code,
                      )}
                    >
                      <LucideIcon
                        name="Check"
                        className={cn(
                          'w-[14px] aspect-square',
                          editor.isActive('textStyle', {
                            color: color.color,
                          })
                            ? 'visible'
                            : 'invisible',
                        )}
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4 w-full max-w-sm">
                {Array.from({ length: colors.length / 8 }).map((_, index) => (
                  <CarouselIndicator key={index} index={index} />
                ))}
              </div>
            </Carousel>
          </div>
        </div>
      }
    />
  );
};

export const TextColorPicker = ({ editor }: { editor: Editor }) => {
  return (
    <UtilsModal
      title="Text color"
      content={
        <Carousel
          opts={{
            align: 'start',
            dragFree: true,
            slidesToScroll: 'auto',
          }}
          className="w-full max-w-md px-4 mx-auto"
        >
          <CarouselContent>
            <CarouselItem
              style={{
                flexBasis: 'calc(100% / 12)',
              }}
            >
              <IconButton
                icon="Ban"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                }}
              />
            </CarouselItem>
            {colors.map((color, index) => (
              <CarouselItem
                key={index}
                style={{
                  flexBasis: 'calc(100% / 12)',
                }}
              >
                <button
                  onClick={() => {
                    editor.chain().focus().setColor(color.color).run();
                  }}
                  key={color.color}
                  className={cn(
                    'w-6 h-6 mb-1 drop-shadow rounded-full flex justify-center items-center cursor-pointer transition',
                    color.code,
                  )}
                >
                  <LucideIcon
                    name="Check"
                    className={cn(
                      'w-[14px] aspect-square',
                      editor.isActive('textStyle', {
                        color: color.color,
                      })
                        ? 'visible'
                        : 'invisible',
                    )}
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-4 w-full max-w-sm">
            {Array.from({ length: colors.length / 8 }).map((_, index) => (
              <CarouselIndicator key={index} index={index} />
            ))}
          </div>
        </Carousel>
      }
    />
  );
};
