import { PluginNavbarLeftSection } from './navbar/navbar';
import { EditorContent } from '@tiptap/react';
import { EditorBubbleMenu } from './components/editor-bubble-menu';
import { DdocProps } from './types';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
import { Button } from './common/button';
import Spinner from './common/spinner';
import EditorToolBar from './components/editor-toolbar';
import './styles/editor.scss';
import 'tippy.js/animations/shift-toward-subtle.css';
import { useDdocEditor } from './use-ddoc-editor';

const DdocEditor = ({
  isPreviewMode = false,
  onPublish,
  data,
  togglePreviewMode,
  enableCollaboration,
  collaborationId,
}: DdocProps) => {
  const { editor, pluginMetaData, focusEditor, setPluginMetaData, ref } =
    useDdocEditor({
      isPreviewMode,
      data,
      enableCollaboration,
      collaborationId,
      onPublish,
      togglePreviewMode,
    });

  if (!editor) {
    return (
      <div className="w-screen h-screen flex flex-col gap-4 justify-center items-center">
        <Spinner />
        <p>Loading Editor...</p>
      </div>
    );
  }

  return (
    <div data-cy="single-webpage" className="bg-[#f9fbfd]">
      <div className="h-full flex flex-col overflow-scroll no-scrollbar">
        <div className="w-full h-screen">
          <div className="h-fit relative bg-[#ffffff]">
            <div className="flex items-center justify-center pl-4 pr-4 border-b-1 border gap-2 h-16">
              <div className="grow">
                <PluginNavbarLeftSection
                  isPreviewMode={isPreviewMode}
                  metaData={pluginMetaData}
                  setMetaData={setPluginMetaData}
                />
              </div>

              {!isPreviewMode && (
                <div className="grow relative">
                  <EditorToolBar editor={editor} />
                </div>
              )}

              <div>
                <Button onClick={() => togglePreviewMode(isPreviewMode)}>
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </Button>
              </div>

              {onPublish && (
                <div>
                  <Button
                    onClick={() =>
                      onPublish({
                        metaData: pluginMetaData,
                        editorJSONData: editor.getJSON(),
                      })
                    }
                  >
                    Publish
                  </Button>
                </div>
              )}
            </div>
          </div>

          <main className="h-screen lg:h-full w-full rounded-[8px] flex flex-col justify-start items-center gap-2">
            <div
              onClick={focusEditor}
              className={`w-full flex justify-center relative`}
            >
              <div className="p-12 sm:p-[96px] mt-4 min-h-[900px] shadow-inner bg-white overflow-scroll no-scrollbar rounded-md w-full sm:w-[70%] max-w-[856px]">
                <div ref={ref} className="w-full pt-4 h-full">
                  {!isPreviewMode && (
                    <div>
                      <EditorBubbleMenu editor={editor} />
                      <ColumnsMenu editor={editor} appendTo={ref} />
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
