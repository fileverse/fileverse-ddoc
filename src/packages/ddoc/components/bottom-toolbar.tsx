import { useEffect, useRef, useState } from 'react';
import {
  TextColorPicker,
  TextFormatingPopup,
  useEditorToolbar,
} from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import { Drawer, DrawerTrigger } from '../common/drawer';
import DynamicModal from './dynamic-modal';
import { TextField } from '../common/textfield';
import cn from 'classnames';
import { useMediaQuery } from 'usehooks-ts';

const BottomToolbar = ({
  editor,
  uploadToIpfs,
}: {
  editor: Editor;
  uploadToIpfs: (f: File) => Promise<string>;
}) => {
  const { toolVisibilty, setToolVisibility, bottomToolbar } = useEditorToolbar({
    editor: editor,
    uploadToIpfs,
  });
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(true);
  const saveLink = () => {
    // cancelled
    if (url === null) {
      setIsUrlValid(false);
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsUrlValid(false);
      return;
    }

    // Add https:// prefix if it's missing
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    // validate link
    try {
      if (
        finalUrl.match(
          /^((http|https):\/\/)?([w|W]{3}\.)+[a-zA-Z0-9\-\.]{3,}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/,
        )
      ) {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: finalUrl })
          .command(({ tr }) => {
            tr.insertText(linkText);
            return true
          })
          .run();
      }

      setIsUrlValid(true);
    } catch (e) {
      console.error('Invalid URL');
      setIsUrlValid(false);
      return;
    }

    // update link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: finalUrl })
      .command(({ tr }) => {
        tr.insertText(linkText);
        return true;
      })
      .run();

    setIsUrlValid(true);
    setToolVisibility(IEditorTool.NONE);
  };

  const getSelectedText = (editor: Editor) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    return text;
  };
  const textFormattingButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let touchStartTime = 0;

    const handleTouchStart = () => {
      touchStartTime = Date.now();
    };

    const handleTouchEnd = () => {
      const touchEndTime = Date.now();
      if (touchEndTime - touchStartTime > 500) { // Long press, likely selecting text
        const { selection } = editor.state;
        const isTextSelected = selection.from !== selection.to;
        if (isTextSelected) {
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


  return (
    <Drawer>
      <div className="flex w-full justify-between sm:justify-evenly">
        {bottomToolbar.map((tool) => {
          if (tool) {
            return (
              <div key={tool.title} className="flex items-center">
                {tool.title === 'Text formating' ? (
                  <DrawerTrigger asChild>
                    <button ref={textFormattingButtonRef} onClick={() => tool.onClick()}>{tool.icon}</button>
                  </DrawerTrigger>
                ) : tool.title === 'Text color' ? (
                  <DrawerTrigger asChild>
                    <button onClick={() => tool.onClick()}>{tool.icon}</button>
                  </DrawerTrigger>
                ) : (
                  <button
                    className={cn(
                      'flex items-center rounded px-2 py-1 text-black transition',
                    )}
                    onClick={() => tool.onClick()}
                  >
                    {tool.icon}
                  </button>
                )}
              </div>
            );
          }
        })}
      </div>
      {toolVisibilty === IEditorTool.TEXT_FORMATING && (
        <TextFormatingPopup
          editor={editor}
          setToolVisibility={setToolVisibility}
        />
      )}
      {toolVisibilty === IEditorTool.TEXT_COLOR_PICKER && (
        <TextColorPicker
          editor={editor}
          setToolVisibility={setToolVisibility}
        />
      )}
      {toolVisibilty === IEditorTool.LINK_POPUP && (
        <DynamicModal
          open={toolVisibilty === IEditorTool.LINK_POPUP}
          onOpenChange={() => setToolVisibility(IEditorTool.NONE)}
          title="Link"
          content={
            <div className="flex flex-col gap-4 w-full h-full px-4">
              <TextField
                label="Text"
                placeholder="Link text"
                className="w-full"
                defaultValue={getSelectedText(editor)}
                onChange={(e) => setLinkText(e.target.value)}
              />
              <TextField
                label="Link"
                placeholder="Paste URL"
                className="w-full"
                defaultValue={editor.getAttributes('link').href}
                onChange={(e) => {
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
      )}
    </Drawer>
  );
};

export default BottomToolbar;
