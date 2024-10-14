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
import { Button, LucideIcon, Tag, TagType, TagInput } from '@fileverse/ui';
import { useMediaQuery, useOnClickOutside } from 'usehooks-ts';
import { AnimatePresence, motion } from 'framer-motion';

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
      secureImageUploadUrl,
      disableBottomToolbar,
      onError,
      setCharacterCount,
      setWordCount,
      tags,
      selectedTags,
      setSelectedTags,
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

    const [isHiddenTagsVisible, setIsHiddenTagsVisible] = useState(false);
    const tagsContainerRef = useRef(null);

    const visibleTags = selectedTags?.slice(0, 4) || [];
    const hiddenTagsCount = selectedTags ? Math.max(0, selectedTags.length - 4) : 0;

    useOnClickOutside(tagsContainerRef, () => {
      setIsHiddenTagsVisible(false);
    });

    useEffect(() => {
      if (selectedTags && selectedTags.length <= 4) {
        setIsHiddenTagsVisible(false);
      }
    }, [selectedTags]);

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
      secureImageUploadUrl
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
      }),
      [editor, ydoc],
    );

    const handleAddTag = (tag: TagType) => {
      const newTags = tag.name.split(',').map(name => {
        const trimmedName = name.trim();
        const existingTag = tags?.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
        return existingTag || { name: trimmedName, color: tag.color };
      });

      setSelectedTags?.(prevTags => {
        const uniqueTags = [...prevTags];
        newTags.forEach(newTag => {
          if (!uniqueTags.some(t => t.name.toLowerCase() === newTag.name.toLowerCase())) {
            uniqueTags.push(newTag);
          }
        });
        return uniqueTags;
      });
    };

    const handleRemoveTag = (tagName: string) => {
      setSelectedTags?.(prevTags => prevTags.filter(tag => tag.name !== tagName));
    };

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
          className={cn("h-14 bg-[#ffffff] py-2 px-4 flex gap-[40px] items-center justify-between w-screen fixed left-0 top-0 border-b color-border-default z-50 transition-transform duration-300",
            {
              'translate-y-0': isNavbarVisible,
              'translate-y-[-100%]': !isNavbarVisible,
            }
          )}
        >
          {renderNavbar?.({ editor: editor.getJSON() })}
        </nav>
        {!isPreviewMode && (
          <div
            id="toolbar"
            className={cn(
              'z-50 hidden xl:flex items-center justify-center w-full h-[52px] fixed left-0 px-1 bg-[#ffffff] border-b color-border-default transition-transform duration-300 top-14',
              { 'translate-y-0': isNavbarVisible, 'translate-y-[-105%]': !isNavbarVisible },
            )}
          >
            <div className="justify-center items-center grow relative">
              <EditorToolBar
                onError={onError}
                editor={editor}
                isNavbarVisible={isNavbarVisible}
                setIsNavbarVisible={setIsNavbarVisible}
                secureImageUploadUrl={secureImageUploadUrl}
              />
            </div>
          </div>
        )}
        <div
          className={cn(
            'p-4 md:px-[80px] md:py-[78px] bg-white w-full md:w-[850px] max-w-[850px] mx-auto shadow-elevation-2 rounded',
            { 'mt-0 md:!mt-16': isPreviewMode },
            { 'md:!mt-16': !isPreviewMode },
            { 'pt-20 md:!mt-[7.5rem]': isNavbarVisible && !isPreviewMode },
            { 'pt-6 md:!mt-16': !isNavbarVisible && !isPreviewMode },
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
                <EditorBubbleMenu editor={editor} onError={onError} />
                <ColumnsMenu editor={editor} appendTo={editorRef} />
              </div>
            )}
            <EditingProvider isPreviewMode={isPreviewMode}>
              {tags && tags.length > 0 && (
                <div ref={tagsContainerRef} className="flex flex-wrap items-center gap-1 mb-4 mt-4 lg:!mt-0">
                  {visibleTags.map((tag, index) => (
                    <Tag
                      key={index}
                      style={{ backgroundColor: tag?.color }}
                      onRemove={() => handleRemoveTag(tag?.name)}
                      isRemovable={!isPreviewMode}
                      className='!h-6 rounded'
                    >
                      {tag?.name}
                    </Tag>
                  ))}
                  {hiddenTagsCount > 0 && !isHiddenTagsVisible && (
                    <Button
                      variant="ghost"
                      className="!h-6 rounded min-w-fit !px-2 color-bg-secondary text-helper-text-sm"
                      onClick={() => setIsHiddenTagsVisible(true)}
                    >
                      +{hiddenTagsCount}
                    </Button>
                  )}
                  <AnimatePresence>
                    {isHiddenTagsVisible && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-wrap items-center gap-1"
                      >
                        {selectedTags?.slice(4).map((tag, index) => (
                          <Tag
                            key={index + 4}
                            style={{ backgroundColor: tag?.color }}
                            onRemove={() => handleRemoveTag(tag?.name)}
                            isRemovable={!isPreviewMode}
                            className='!h-6 rounded'
                          >
                            {tag?.name}
                          </Tag>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <TagInput
                    tags={tags || []}
                    selectedTags={selectedTags as TagType[]}
                    onAddTag={handleAddTag}
                    isPreviewMode={isPreviewMode}
                  />
                </div>
              )}
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