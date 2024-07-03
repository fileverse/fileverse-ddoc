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
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cn from 'classnames';
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
      onAutoSave,
      renderToolRightSection,
      renderToolLeftSection,
      walletAddress,
      onChange,
      handleImageUploadToIpfs,
      onCollaboratorChange,
    }: DdocProps,
    ref,
  ) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {
      editor,
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
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
      }),
      [editor, ydoc],
    );

    const [scrolled, setScrolled] = useState<number | false>(false);

    const defaultHeight = useRef(window.innerHeight);

    const isIOS = useMemo(() => checkOs() === "iOS", []);

    const scrollTop = useRef<number | undefined>(undefined);

    const offset = useRef<number>(0);

    const offsetInterval = useRef<ReturnType<typeof setInterval>>();

    const editorHeight = useMemo(
      () =>
        window
          ? isIOS
            ?
            defaultHeight.current - 305
            : defaultHeight.current
          : 600,
      [isIOS]
    );

    const stopScrollTimeout = useRef<ReturnType<typeof setTimeout>>();

    const scrollEditor = useCallback((offset: number) => {
      const editorElement = document.getElementById("editor");
      if (editorElement) {
        editorElement.scrollTo({
          top: offset,
          behavior: "smooth"
        });
      }
      setScrolled(Math.round(offset));
    }, []);

    const stopScroll = useCallback(
      () => {
        if (isIOS) {
          window.scrollTo({
            top: scrollTop.current,
            behavior: 'smooth'
          });
          scrollTop.current = undefined;
        }
      },
      [isIOS, scrollTop]
    );

    const handleTouchEnd = useCallback(() => {
      stopScroll();
    }, [stopScroll]);

    const getScrollTop = () => {
      if (scrollTop.current === undefined) {
        const editorWrapper = document.getElementById("editor-wrapper");
        scrollTop.current = editorWrapper ? editorWrapper.getBoundingClientRect().top + window.pageYOffset : 0;
      }
    };

    useEffect(() => {
      if (isIOS && !offsetInterval.current) {
        offsetInterval.current = setInterval(() => {
          const editorWrapper = document.getElementById("editor-wrapper");
          scrollTop.current = editorWrapper ? window.scrollY + editorWrapper.getBoundingClientRect().top : 0;
        }, 1000);
      }
      return () => {
        if (offsetInterval.current) clearInterval(offsetInterval.current);
      };
    }, [isIOS]);

    useEffect(() => () => {
      if (stopScrollTimeout.current) clearTimeout(stopScrollTimeout.current);
    }, []);

    useEffect(() => {
      document.addEventListener("touchstart", getScrollTop);
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("touchstart", getScrollTop);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }, [handleTouchEnd]);

    useEffect(() => {
      if (!isIOS) {
        return;
      }

      const handleFocus = () => {
        setIsKeyboardVisible(true);
      };

      const handleBlur = () => {
        setIsKeyboardVisible(false);
      };

      editor?.on('focus', handleFocus);
      editor?.on('blur', handleBlur);

      return () => {
        editor?.off('focus', handleFocus);
        editor?.off('blur', handleBlur);
      };
    }, [editor, isIOS, setIsKeyboardVisible]);

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
        data-cy='single-webpage'
        className='bg-[#f8f9fa] h-full w-full'
      >
        <div
          id="editor-wrapper"
          onFocus={() => {
            if (isIOS) {
              stopScroll();
              const scrollAmount = offset.current - defaultHeight.current / 3;
              scrollEditor(scrollAmount);
            }
          }}
          onBlur={() => {
            setScrolled(false);
          }}
          className={cn('flex flex-col justify-between items-center overflow-scroll')}>
          <div id="toolbar" className='flex items-center w-full h-16 fixed z-10 px-4 bg-[#f8f9fa]'>
            <div className='flex items-center justify-between gap-2 w-full'>
              <div className='grow'>
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
              className='mt-8 lg:mt-[5rem] w-screen flex justify-center relative'
            >
              <div className='px-4 pt-12 sm:p-[88px] h-screen bg-white w-full sm:w-[70%] max-w-[856px]'>
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
                      onTouchEnd={(e) => {
                        if (isIOS && !scrolled && e.target instanceof HTMLElement) {
                          offset.current = e.target.offsetTop + e.target.clientHeight;
                        }
                      }}
                      className='w-full overflow-x-hidden overflow-y-scroll lg:overflow-hidden no-scrollbar'
                      style={{
                        height: isKeyboardVisible ? `calc(${editorHeight}px - 110px)` : `calc(${editorHeight}px + 160px)`,
                      }}
                    />
                  </EditingProvider>
                  {!isPreviewMode && (
                    <AnimatePresence>
                      {!isTyping && (
                        <motion.div
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 50, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'flex xl:hidden items-center w-full h-16 fixed left-0 z-10 px-4 bg-[#f8f9fa] bottom-0 transition-all duration-300 ease-in-out',
                            {
                              'bottom-[270px]': isKeyboardVisible,
                              'bottom-0': !isKeyboardVisible,
                            }
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
            </div>
          </main>


        </div >
      </div >
    );
  },
);

export default DdocEditor;
