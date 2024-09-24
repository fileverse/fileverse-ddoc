import { EditorContent, isTextSelection } from '@tiptap/react';
import { EditorBubbleMenu } from './components/editor-bubble-menu';
import { DdocProps } from './types';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
import { Spinner } from './common/spinner';
import EditorToolBar from './components/editor-toolbar';
import './styles/editor.scss';
import 'tippy.js/animations/shift-toward-subtle.css';
import { useDdocEditor } from './use-ddoc-editor';
import './styles/index.css';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import cn from 'classnames';
import { Button, LucideIcon } from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';

import platform from 'platform';
import MobileToolbar from './components/mobile-toolbar';

const checkOs = () => platform.os?.family;

const DdocEditor = forwardRef(
  (
    {
      isPreviewMode = false,
      initialContent,
      enableCollaboration,
      collaborationId,
      username,
      renderNavbar,
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
      setCharacterCount,
      setWordCount,
    }: DdocProps,
    ref,
  ) => {
    const [isNavbarVisible, setIsNavbarVisible] = useState(true);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const btn_ref = useRef(null);
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isNativeMobile =
      checkOs() === 'iOS' ||
      checkOs() === 'Android' ||
      checkOs() === 'Windows Phone' ||
      isMobile;

    const {
      editor,
      ref: editorRef,
      isContentLoading,
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
      setCharacterCount,
      setWordCount,
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

    if (!editor || isContentLoading) {
      return (
        <div className="w-screen h-screen flex flex-col gap-4 justify-center items-center">
          <Spinner />
          <p>Loading Editor...</p>
        </div>
      );
    }

    return (
      <div data-cy="single-webpage" className="bg-[#f8f9fa] h-full w-full">
        <nav
          id="Navbar"
          className="h-14 bg-[#ffffff] py-2 px-3 xl:px-4 flex gap-[40px] items-center justify-between w-screen xl:w-full fixed left-0 top-0 border-b color-border-default z-50 transition-transform duration-300"
          style={{ transform: isNavbarVisible ? 'translateY(0)' : 'translateY(-100%)' }}
        >
          {renderNavbar?.({ editor: editor.getJSON() })}
        </nav>
        {!isPreviewMode && (
          <div
            id="toolbar"
            className={cn(
              'z-50 hidden xl:flex items-center justify-center w-full h-[52px] fixed left-0 px-1 bg-[#ffffff] border-b color-border-default transition-transform duration-300 top-14',
            )}
            style={{ transform: isNavbarVisible ? 'translateY(0)' : 'translateY(-100%)' }}
          >
            <div className="justify-center items-center grow relative">
              <EditorToolBar
                onError={onError}
                editor={editor}
                isNavbarVisible={isNavbarVisible}
                setIsNavbarVisible={setIsNavbarVisible}
              />
            </div>
          </div>
        )}
        <div
          className={cn(
            'p-4 md:px-[80px] md:mt-12 md:py-[78px] bg-white w-full md:w-[850px] max-w-[850px] mx-auto shadow-elevation-2 rounded',
            { 'mt-0 xl:!mt-6': isPreviewMode },
            { 'pt-20 md:mt-[7.5rem]': isNavbarVisible },
            { 'pt-6 md:mt-[4rem]': !isNavbarVisible },
          )}
          style={{
            height:
              isNativeMobile && !isPreviewMode ? 'calc(100vh - 4rem)' : '95vh',
          }}
        >
          <div
            ref={editorRef}
            className="w-full h-full overflow-y-scroll overflow-x-hidden no-scrollbar pt-8 md:pt-0"
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
              <LucideIcon name="MessageSquareText" size="sm" />
            </Button>
          )}
        </div>
        {!isPreviewMode && !disableBottomToolbar && (
          <div
            className={cn(
              'flex xl:hidden items-center w-full h-[52px] absolute left-0 z-10 px-4 bg-[#ffffff] transition-all duration-300 ease-in-out border-b border-color-default',
              isKeyboardVisible && 'hidden',
              { 'top-14': isNavbarVisible, 'top-0': !isNavbarVisible },
            )}
          >
            <MobileToolbar
              onError={onError}
              editor={editor}
              isKeyboardVisible={isKeyboardVisible}
              isNavbarVisible={isNavbarVisible}
              setIsNavbarVisible={setIsNavbarVisible}
            />
          </div>
        )}
      </div>
    );
  },
);

export default DdocEditor;