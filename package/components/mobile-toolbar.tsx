/* eslint-disable no-useless-escape */
import { useEffect, useRef, useState } from 'react';
import { TextFormatingPopup, useEditorToolbar } from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import {
  LucideIcon,
  TextField,
  Drawer,
  DrawerTrigger,
  DynamicModal,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import ToolbarButton from '../common/toolbar-button';

const MobileToolbar = ({
  editor,
  onError,
  isKeyboardVisible,
  isNavbarVisible,
  setIsNavbarVisible,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
  isKeyboardVisible: boolean;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { toolVisibilty, setToolVisibility, bottomToolbar } = useEditorToolbar({
    editor: editor,
    onError,
  });
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isTextValid, setIsTextValid] = useState(true);
  const [isUrlValid, setIsUrlValid] = useState(true);
  const textFormattingButtonRef = useRef<HTMLButtonElement>(null);

  const saveLink = () => {
    // cancelled
    if (url === null) {
      setIsUrlValid(false);
      setToolVisibility(IEditorTool.NONE);
      return;
    }

    if (linkText === '' && url === '') {
      setToolVisibility(IEditorTool.NONE);
      setIsTextValid(true);
      setIsUrlValid(true);
      return;
    }
    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setToolVisibility(IEditorTool.NONE);
      return;
    }

    // Add https:// prefix if it's missing
    let finalUrl = url;
    if (!url.startsWith('http://') || !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    } else {
      finalUrl = url;
    }

    // validate link
    try {
      if (
        finalUrl.match(
          /^((http|https):\/\/)?([w|W]{3}\.)+[a-zA-Z0-9\-\.]{3,}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/,
        )
      ) {
        setIsUrlValid(true);
      }
    } catch (e) {
      console.error('Invalid URL');
      setIsUrlValid(false);
    }

    const { from, to } = editor.state.selection;
    // isSelected which will return true if the current selection is either a link or a text
    const isSelected = editor.state.doc.textBetween(from, to);

    if (isSelected) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: finalUrl })
        .run();
    } else {
      // create link via popup
      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          const { from, to } = editor.state.selection;
          const text = linkText;
          const link = { href: finalUrl };
          tr.insertText(text, from, to);
          tr.addMark(
            from,
            text.length + from,
            editor.schema.marks.link.create(link),
          );

          if (dispatch) {
            dispatch(tr);
          }

          return true;
        })
        .run();
    }

    setIsUrlValid(true);
    setIsTextValid(true);
    setLinkText('');
    setUrl('');
    setToolVisibility(IEditorTool.NONE);
  };

  const getSelectedText = (editor: Editor) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    return text;
  };

  const getSelectedTextUrl = (editor: Editor) => {
    const url = editor.getAttributes('link').href;
    return url;
  };

  useEffect(() => {
    let touchStartTime = 0;

    const handleTouchStart = () => {
      touchStartTime = Date.now();
    };

    const handleTouchEnd = () => {
      const touchEndTime = Date.now();
      if (touchEndTime - touchStartTime > 500) {
        // Long press, likely selecting text
        const { selection } = editor.state;
        const isTextSelected = selection.from !== selection.to;
        const isImageSelected =
          editor.state.doc.nodeAt(selection.from)?.type.name ===
          'resizableMedia';
        const isIframeSelected =
          editor.state.doc.nodeAt(selection.from)?.type.name === 'iframe';
        if (isTextSelected && !isImageSelected && !isIframeSelected) {
          textFormattingButtonRef.current?.click();
        }
      }
    };

    const handleMouseUp = () => {
      if (!isMobile) return;
      const { selection } = editor.state;
      const isTextSelected = selection.from !== selection.to;

      if (isTextSelected) {
        textFormattingButtonRef.current?.click();
      }
    };

    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (isMobile) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      } else {
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [editor, isMobile]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (toolVisibilty !== IEditorTool.LINK_POPUP) {
          setToolVisibility(IEditorTool.LINK_POPUP);
        } else {
          setToolVisibility(IEditorTool.NONE);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, toolVisibilty]);

  useEffect(() => {
    if (isKeyboardVisible) {
      setToolVisibility(IEditorTool.NONE);
    }
  }, [isKeyboardVisible, setToolVisibility]);

  return (
    <Drawer>
      <div className="flex w-full justify-between sm:justify-evenly items-center select-none">
        {bottomToolbar.map((tool, _index) => {
          if (tool) {
            return (
              <div key={tool.title} className="flex items-center">
                {tool.title === 'Text formating' ? (
                  <DrawerTrigger asChild>
                    <ToolbarButton
                      ref={textFormattingButtonRef}
                      onClick={tool.onClick}
                      isActive={tool.isActive}
                      icon={tool.icon}
                    />
                  </DrawerTrigger>
                ) : tool.title === 'Text color' ? (
                  <DrawerTrigger asChild>
                    <ToolbarButton
                      onClick={tool.onClick}
                      icon={tool.icon}
                      isActive={false}
                    />
                  </DrawerTrigger>
                ) : (
                  <ToolbarButton
                    onClick={tool.onClick}
                    icon={tool.icon}
                    isActive={false}
                  />
                )}
              </div>
            );
          } else {
            return (
              <div key={_index} className="w-[2px] h-4 bg-gray-200 mx-2"></div>
            );
          }
        })}
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <div className="w-9 h-9 flex justify-center items-center">
          <LucideIcon
            size={'md'}
            name={isNavbarVisible ? 'ChevronUp' : 'ChevronDown'}
            onClick={() => setIsNavbarVisible((prev) => !prev)}
          />
        </div>
      </div>
      {toolVisibilty === IEditorTool.TEXT_FORMATING && (
        <TextFormatingPopup
          editor={editor}
          setToolVisibility={setToolVisibility}
        />
      )}
      <DynamicModal
        open={toolVisibilty === IEditorTool.LINK_POPUP}
        onOpenChange={(open) => !open && setToolVisibility(IEditorTool.NONE)}
        title="Link"
        content={
          <div className="flex flex-col gap-4 w-full h-full px-4">
            <TextField
              label="Text"
              placeholder="Link text"
              className="w-full"
              defaultValue={getSelectedText(editor)}
              onChange={(e) => {
                e.preventDefault();
                setLinkText(e.target.value);
              }}
              isValid={isTextValid}
              message={isTextValid ? '' : 'Invalid text'}
            />
            <TextField
              label="Link"
              placeholder="Paste URL"
              className="w-full"
              defaultValue={getSelectedTextUrl(editor)}
              onChange={(e) => {
                e.preventDefault();
                setUrl(e.target.value);
              }}
              isValid={isUrlValid}
              message={isUrlValid ? '' : 'Invalid URL'}
            />
          </div>
        }
        primaryAction={{
          label: 'Save',
          onClick: () => saveLink(),
          isLoading: false,
          className: 'w-auto min-w-[80px]',
        }}
        secondaryAction={{
          label: 'Cancel',
          variant: 'secondary',
          onClick: () => setToolVisibility(IEditorTool.NONE),
          className: 'w-auto min-w-[80px]',
        }}
      />
    </Drawer>
  );
};

export default MobileToolbar;
