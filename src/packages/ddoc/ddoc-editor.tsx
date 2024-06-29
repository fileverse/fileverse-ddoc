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
import { forwardRef, useImperativeHandle } from 'react';

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
      ensProviderUrl,
      onChange,
      onCollaboratorChange
    }: DdocProps,
    ref
  ) => {
    const {
      editor,
      focusEditor,
      ref: editorRef,
      loading,
      ydoc
    } = useDdocEditor({
      isPreviewMode,
      initialContent,
      enableCollaboration,
      collaborationId,
      ensProviderUrl,
      username,
      onAutoSave,
      onChange,
      onCollaboratorChange
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc
      }),
      [editor, ydoc]
    );

    if (!editor || loading) {
      return (
        <div className='w-screen h-screen flex flex-col gap-4 justify-center items-center'>
          <Spinner />
          <p>Loading Editor...</p>
        </div>
      );
    }

    return (
      <div
        data-cy='single-webpage'
        className='bg-[#f8f9fa]'
      >
        <div className='h-full flex flex-col overflow-scroll no-scrollbar'>
          <div className='w-full h-full'>
            <div className='flex items-center w-full h-16 fixed z-10 px-4 bg-[#f8f9fa]'>
              <div className='flex items-center justify-between gap-2 w-full'>
                <div className='grow'>
                  {renderToolLeftSection?.({ editor: editor.getJSON() })}
                </div>

                {!isPreviewMode && (
                  <div className='grow relative hidden xl:block'>
                    <EditorToolBar editor={editor} />
                  </div>
                )}
                {renderToolRightSection?.({ editor: editor.getJSON() })}
              </div>
            </div>

            <main className='h-screen lg:h-full w-full rounded-[8px] flex flex-col justify-start items-center gap-2'>
              <div
                onClick={focusEditor}
                className='mt-8 lg:mt-[5rem] w-full flex justify-center relative'
              >
                <div className='px-4 pt-12 sm:p-[88px] h-screen bg-white overflow-scroll no-scrollbar w-full sm:w-[70%] max-w-[856px]'>
                  <div
                    ref={editorRef}
                    className='w-full h-full'
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
                      <EditorContent editor={editor} />
                    </EditingProvider>
                  </div>
                </div>
              </div>
            </main>

            {!isPreviewMode && (
              <div className='flex xl:hidden items-center w-full h-16 fixed bottom-0 z-10 px-4 bg-[#f8f9fa]'>
                <BottomToolbar editor={editor} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default DdocEditor;
