import { useEffect } from 'react';
import { PluginNavbarLeftSection } from './navbar/navbar';
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

const DdocEditor = ({
  isPreviewMode = false,
  data,
  enableCollaboration,
  collaborationId,
  username,
  onAutoSave,
  renderRightSection
}: DdocProps) => {
  const {
    editor,
    pluginMetaData,
    focusEditor,
    setPluginMetaData,
    ref,
    loading,
    connect
  } = useDdocEditor({
    isPreviewMode,
    data,
    enableCollaboration,
    collaborationId
  });

  useEffect(() => {
    if (enableCollaboration && username) {
      connect(username);
    }
  }, [enableCollaboration]);

  useEffect(() => {
    if (editor && onAutoSave) {
      const interval = setInterval(() => {
        onAutoSave({
          metaData: pluginMetaData,
          editorJSONData: editor.getJSON()
        });
      }, 10000); // Save every 10 seconds (adjust the interval as needed)
      return () => clearInterval(interval);
    }
  }, [editor, onAutoSave, pluginMetaData]);

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
        <div className='w-full h-screen'>
          <div className='h-fit relative bg-[#f8f9fa]'>
            <div className='flex items-center justify-center pl-4 pr-4 gap-2 h-16'>
              <div className='grow'>
                <PluginNavbarLeftSection
                  isPreviewMode={isPreviewMode}
                  metaData={pluginMetaData}
                  setMetaData={setPluginMetaData}
                />
              </div>

              {!isPreviewMode && (
                <div className='grow relative'>
                  <EditorToolBar editor={editor} />
                </div>
              )}
              {renderRightSection?.({ editor, pluginMetaData })}
            </div>
          </div>

          <main className='h-screen lg:h-full w-full rounded-[8px] flex flex-col justify-start items-center gap-2'>
            <div
              onClick={focusEditor}
              className={`w-full flex justify-center relative`}
            >
              <div className='p-12 sm:p-[96px] mt-4 min-h-[900px] bg-white overflow-scroll no-scrollbar w-full sm:w-[70%] max-w-[856px]'>
                <div
                  ref={ref}
                  className='w-full pt-4 h-full'
                >
                  {!isPreviewMode && (
                    <div>
                      <EditorBubbleMenu editor={editor} />
                      <ColumnsMenu
                        editor={editor}
                        appendTo={ref}
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
        </div>
      </div>
    </div>
  );
};

export default DdocEditor;
