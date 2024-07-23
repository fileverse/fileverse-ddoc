import { EditorContent, isTextSelection } from '@tiptap/react';
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
import { Button } from './common/button';
import { MessageSquareText } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';

import platform from 'platform';

const checkOs = () => platform.os?.family;

const DdocEditor = forwardRef(
  (
    {
      isPreviewMode = false,
      initialContent,
      enableCollaboration,
      collaborationId,
      username,
      renderToolRightSection,
      renderToolLeftSection,
      walletAddress,
      onChange,
      onCollaboratorChange,
      onTextSelection,
      onCommentInteraction,
      handleCommentButtonClick,
      showCommentButton,
      ensResolutionUrl,
      disableBottomToolbar,
      onError,
    }: DdocProps,
    ref,
  ) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const btn_ref = useRef(null);
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isNativeMobile = checkOs() === 'iOS' || checkOs() === 'Android' || checkOs() === 'Windows Phone' || isMobile;

    const {
      editor,
      ref: editorRef,
      ydoc,
    } = useDdocEditor({
      isPreviewMode,
      initialContent,
      enableCollaboration,
      collaborationId,
      walletAddress,
      username,
      onChange,
      onCollaboratorChange,
      onCommentInteraction,
      onTextSelection,
      ensResolutionUrl,
      onError,
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
      }),
      [editor, ydoc],
    );

    useEffect(() => {
      if (!editor) return;

      const isCharacterKey = (event: KeyboardEvent) => {
        const { key } = event;
        return key.length === 1;
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (isCharacterKey(event) && isNativeMobile) {
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
    }, [editor, isNativeMobile]);

    useEffect(() => {
      if (!editor) return;
      if (isNativeMobile) {
        const { selection } = editor.state;
        const isTextSelected = isTextSelection(selection);

        const handleKeyboardShow = () => {
          setIsKeyboardVisible(true);
        };

        const handleKeyboardHide = () => {
          setIsKeyboardVisible(false);
        };

        !isTextSelected && editor.on('focus', handleKeyboardShow);
        isTextSelected && editor.on('blur', handleKeyboardHide);

        return () => {
          editor.off('focus', handleKeyboardShow);
          editor.off('blur', handleKeyboardHide);
        };
      }
    }, [isNativeMobile, editor]);

    useEffect(() => {
      if (!editor) return;
      // Pressing the enter key will scroll the editor to the current selection
      const handleEnterKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          editor.commands.scrollIntoView();
        }
      };

      const editorElement = editor.view.dom;

      editorElement.addEventListener('keydown', handleEnterKey);

      return () => {
        editorElement.removeEventListener('keydown', handleEnterKey);
      };
    }, [editor]);

    // Push the editor to the top when the keyboard is visible
    useEffect(() => {
      if (!isNativeMobile || !editor) return;

      const handleKeyboardShow = () => {
        if (editorRef.current) {
          editorRef.current.scrollIntoView();
        }
      };

      const editorElement = editor.view.dom;

      editorElement.addEventListener('resize', handleKeyboardShow);

      return () => {
        editorElement.removeEventListener('resize', handleKeyboardShow);
      };
    }, [editor, editorRef, isNativeMobile]);

    if (!editor) {
      return (
        <div className="w-screen h-screen flex flex-col gap-4 justify-center items-center">
          <Spinner />
          <p>Loading Editor...</p>
        </div>
      );
    }

    return (
      <div data-cy="single-webpage" className="bg-[#f8f9fa] h-full w-full">
        <div
          id="toolbar"
          className="flex items-center w-full h-16 sticky left-0 top-0 z-10 px-4 bg-[#f8f9fa]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="grow">
              {renderToolLeftSection?.({ editor: editor.getJSON() })}
            </div>

            {!isPreviewMode && (
              <div className="grow relative hidden xl:block">
                <EditorToolBar
                  onError={onError}
                  editor={editor}
                />
              </div>
            )}
            {renderToolRightSection?.({ editor: editor.getJSON() })}
          </div>
        </div>
        <div className="p-4 sm:px-[88px] sm:py-[78px] bg-white w-full sm:w-[70%] max-w-[856px] mx-auto"
          style={{
            height: isNativeMobile && !isPreviewMode ? 'calc(100vh - 8rem)' : '100vh',
          }}
        >
          <div
            ref={editorRef}
            className="w-full h-full overflow-y-scroll overflow-x-hidden no-scrollbar"
          >

            {!isPreviewMode && (
              <div>
                <EditorBubbleMenu editor={editor} />
                <ColumnsMenu editor={editor} appendTo={editorRef} />
              </div>
            )}
            <EditingProvider isPreviewMode={isPreviewMode}>
              <EditorContent
                editor={editor}
                id="editor"
                className="w-full h-full py-4"
              />
            </EditingProvider>

          </div>
          {showCommentButton && !isNativeMobile && (
            <Button
              ref={btn_ref}
              onClick={() => {
                handleCommentButtonClick?.(editor);
              }}
              variant="ghost"
              className={cn(
                'absolute w-12 h-12 bg-white rounded-full shadow-xl top-[70px] right-[-23px]',
              )}
            >
              <MessageSquareText />
            </Button>
          )}
        </div>
        {!isPreviewMode && (
          <AnimatePresence>
            {!isTyping && !disableBottomToolbar && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex xl:hidden items-center w-full h-16 fixed left-0 bottom-0 z-10 px-4 bg-[#f8f9fa] transition-all duration-300 ease-in-out',
                  isKeyboardVisible && 'hidden',
                )}
              >
                <BottomToolbar
                  onError={onError}
                  editor={editor}
                  isKeyboardVisible={isKeyboardVisible}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  },
);

export default DdocEditor;
