import { EditorContent } from '@tiptap/react';
import { EditorBubbleMenu } from './components/editor-bubble-menu';
import { DdocProps } from './types';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
import Spinner from './common/spinner';
import EditorToolBar from './components/editor-toolbar';
import './styles/editor.scss';
import 'tippy.js/animations/shift-toward-subtle.css';
import { useDdocEditor } from './use-ddoc-editor';
import BottomToolbar from './components/bottom-toolbar';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cn from 'classnames';

const DdocEditor = forwardRef(
  (
    {
      isPreviewMode = false,
      initialContent,
      enableCollaboration,
      collaborationId,
      username,
      onAutoSave,
      renderToolRightSection,
      renderToolLeftSection,
      walletAddress,
      onChange,
      handleImageUploadToIpfs,
      onCollaboratorChange,
      onTextSelection,
      onCommentInteraction,
    }: DdocProps,
    ref,
  ) => {
    // const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const {
      editor,
      // focusEditor,
      ref: editorRef,
      loading,
      ydoc,
    } = useDdocEditor({
      isPreviewMode,
      initialContent,
      enableCollaboration,
      collaborationId,
      walletAddress,
      username,
      onAutoSave,
      onChange,
      onCollaboratorChange,
      onCommentInteraction,
      onTextSelection,
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
      }),
      [editor, ydoc],
    );

    // useEffect(() => {
    //   const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    //   if (!iOS) {
    //     return;
    //   }

    //   const handleFocus = () => {
    //     setIsKeyboardVisible(true);
    //   };

    //   const handleBlur = () => {
    //     setIsKeyboardVisible(false);
    //   };

    //   editor?.on('focus', handleFocus);
    //   editor?.on('blur', handleBlur);

    //   return () => {
    //     editor?.off('focus', handleFocus);
    //     editor?.off('blur', handleBlur);
    //   };
    // }, [editor]);

    useEffect(() => {
      if (!editor) return;

      const isCharacterKey = (event: KeyboardEvent) => {
        const { key } = event;
        return key.length === 1;
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (isCharacterKey(event)) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          setIsTyping(true);
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 500);
        }
      };

      const editorElement = editor.view.dom;
      editorElement.addEventListener('keydown', handleKeyDown);

      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, [editor]);

    if (!editor || loading) {
      return (
        <div className="w-screen h-screen flex flex-col gap-4 justify-center items-center">
          <Spinner />
          <p>Loading Editor...</p>
        </div>
      );
    }

    return (
      <div
        data-cy="single-webpage"
        className="bg-[#f8f9fa] h-full w-full overflow-hidden no-scrollbar"
      >
        <div className="flex flex-col justify-between items-center">
          <div className="flex items-center w-full h-16 fixed z-10 px-4 bg-[#f8f9fa]">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="grow">
                {renderToolLeftSection?.({ editor: editor.getJSON() })}
              </div>

              {!isPreviewMode && (
                <div className="grow relative hidden xl:block">
                  <EditorToolBar
                    uploadToIpfs={handleImageUploadToIpfs}
                    editor={editor}
                  />
                </div>
              )}
              {renderToolRightSection?.({ editor: editor.getJSON() })}
            </div>
          </div>

          <main className="rounded-[8px] flex flex-col justify-start items-center gap-2 ">
            <div
              // onClick={focusEditor}
              className="mt-8 lg:mt-[5rem] w-screen flex justify-center relative"
            >
              <div className="px-4 pt-8 sm:px-[88px] sm:py-[78px] h-screen bg-white  w-full sm:w-[70%] max-w-[856px]">
                <div
                  ref={editorRef}
                  className="w-full h-full overflow-y-scroll overflow-x-hidden no-scrollbar"
                >
                  {!isPreviewMode && (
                    <div>
                      <EditorBubbleMenu editor={editor} />
                      <ColumnsMenu
                        editor={editor}
                        appendTo={editorRef}
                      />
                    </div>
                  )}
                  <EditingProvider isPreviewMode={isPreviewMode}>
                    <EditorContent
                      editor={editor}
                      className="py-4"
                    />
                  </EditingProvider>
                </div>
              </div>
            </div>
          </main>

          {!isPreviewMode && (
            <AnimatePresence>
              {!isTyping && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex xl:hidden items-center w-full h-16 fixed z-10 px-4 bg-[#f8f9fa] bottom-0',
                    // {
                    //   'bottom-[268px]': isKeyboardVisible,
                    //   'bottom-0': !isKeyboardVisible,
                    // }
                  )}
                >
                  <BottomToolbar
                    uploadToIpfs={handleImageUploadToIpfs}
                    editor={editor}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  },
);

export default DdocEditor;
