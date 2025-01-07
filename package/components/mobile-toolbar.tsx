import { useEffect, useState } from 'react';
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
import ToolbarButton from '../common/toolbar-button';

const MobileToolbar = ({
  editor,
  onError,
  isKeyboardVisible,
  isNavbarVisible,
  setIsNavbarVisible,
  secureImageUploadUrl,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
  isKeyboardVisible: boolean;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  secureImageUploadUrl?: string;
}) => {
  const { toolVisibility, setToolVisibility, bottomToolbar } = useEditorToolbar(
    {
      editor: editor,
      onError,
      secureImageUploadUrl,
    },
  );
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isTextValid, setIsTextValid] = useState(true);
  const [isUrlValid, setIsUrlValid] = useState(true);

  const saveLink = () => {
    if (
      (url === null || url === '') &&
      (linkText === '' || linkText === null)
    ) {
      setToolVisibility(IEditorTool.NONE);
      return;
    }

    let finalUrl = url;
    if (
      finalUrl &&
      !finalUrl.startsWith('http://') &&
      !finalUrl.startsWith('https://')
    ) {
      finalUrl = 'https://' + finalUrl;
    }

    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?|\w+@[\w.-]+\.\w+)$/i;
    if (finalUrl && !urlPattern.test(finalUrl)) {
      setIsUrlValid(false);
      if (onError) onError('Invalid URL');
      return;
    }

    const { from, to } = editor.state.selection;
    const isSelected = editor.state.doc.textBetween(from, to).length > 0;

    if (isSelected) {
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: finalUrl ? [{ type: 'link', attrs: { href: finalUrl } }] : [],
        })
        .run();
    } else if (linkText) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: finalUrl ? [{ type: 'link', attrs: { href: finalUrl } }] : [],
        })
        .run();
    }

    setIsUrlValid(true);
    setIsTextValid(true);
    setToolVisibility(IEditorTool.NONE);
  };

  const getSelectedLink = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const linkMark = editor.getAttributes('link');
    return {
      text: selectedText || linkMark.text || '',
      url: linkMark.href || '',
    };
  };

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (toolVisibility !== IEditorTool.LINK_POPUP) {
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
  }, [editor, toolVisibility]);

  useEffect(() => {
    if (isKeyboardVisible) {
      setToolVisibility(IEditorTool.NONE);
    }
  }, [isKeyboardVisible, setToolVisibility]);

  useEffect(() => {
    if (toolVisibility === IEditorTool.LINK_POPUP) {
      const { text, url } = getSelectedLink();
      setLinkText(text);
      setUrl(url);
    }
  }, [toolVisibility, editor]);

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
      <TextFormatingPopup
        editor={editor}
        isOpen={toolVisibility === IEditorTool.TEXT_FORMATING}
        setIsOpen={(open) => !open && setToolVisibility(IEditorTool.NONE)}
        setToolVisibility={setToolVisibility}
      />
      <DynamicModal
        open={toolVisibility === IEditorTool.LINK_POPUP}
        onOpenChange={(open) => !open && setToolVisibility(IEditorTool.NONE)}
        title="Link"
        content={
          <div className="flex flex-col gap-4 w-full h-full text-base">
            <TextField
              label="Text"
              placeholder="Link text"
              className="w-full text-base"
              defaultValue={getSelectedLink().text}
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
              className="w-full text-base"
              defaultValue={getSelectedLink().url}
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
          className: 'w-full md:w-auto min-w-[80px]',
        }}
        secondaryAction={{
          label: 'Cancel',
          variant: 'secondary',
          onClick: () => setToolVisibility(IEditorTool.NONE),
          className: 'w-full md:w-auto min-w-[80px]',
        }}
      />
    </Drawer>
  );
};

export default MobileToolbar;
