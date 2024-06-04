import React, { useEffect, useRef, useState } from 'react';
import { PluginNavbarLeftSection } from './navbar/navbar';
import { AnyExtension, EditorContent, useEditor } from '@tiptap/react';
import { defaultExtensions } from './extensions/default-extension';
import { EditorBubbleMenu } from './editor-bubble-menu';
import { PluginMetaData, DdocProps, DdocEditorProps } from './props';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
import { Button } from './common/button';
import Spinner from './common/spinner';
import EditorToolBar from './editor-toolbar';
import './styles/editor.scss';
import 'tippy.js/animations/shift-toward-subtle.css';

const DdocEditor = ({
  isPreviewMode = false,
  onPublish,
  data,
  togglePreviewMode,
}: DdocProps) => {
  const [pluginMetaData, setPluginMetaData] = useState<PluginMetaData>({
    cover: {
      image: null,
      emoji: null,
      name: null,
    },
    plugin: {
      title: null,
    },
  });

  const editor = useEditor({
    extensions: [...(defaultExtensions as AnyExtension[])],
    editorProps: DdocEditorProps,
    autofocus: 'start',
  });

  const ref = useRef<HTMLDivElement>(null);

  const focusEditor = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if ((ref.current as any)?.contains(e.target)) return;
    editor?.chain().focus().run();
  };

  useEffect(() => {
    editor?.chain().focus();
  }, []);

  useEffect(() => {
    editor?.setEditable(!isPreviewMode);
  }, [isPreviewMode]);

  useEffect(() => {
    if (data && editor) {
      editor?.commands.setContent(data);
    }
  }, [data, editor]);

  if (!editor) {
    return (
      <div className=" w-screen h-screen flex flex-col gap-4 justify-center items-center">
        <Spinner />
        <p>Loading Editor...</p>
      </div>
    );
  }

  return (
    <div data-cy="single-webpage" className="h-screen w-screen bg-[#f9fbfd]">
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
                <div
                  onClick={() =>
                    onPublish({
                      metaData: pluginMetaData,
                      editorJSONData: editor.getJSON(),
                    })
                  }
                  className="cursor-pointer"
                >
                  <Button>Publish</Button>
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
