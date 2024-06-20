import React from 'react'
import { TextFormatingPopup, useEditorToolbar } from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import { Drawer, DrawerTrigger } from '../common/drawer';
import LinkModal from './link-modal';
import { TextField } from '../common/textfield';
import cn from 'classnames';

const BottomToolbar = ({ editor }: { editor: Editor }) => {
  const { toolRef, toolVisibilty, setToolVisibility, bottomToolbar } =
    useEditorToolbar({
      editor: editor,
    });
  return (
    <Drawer>
      <div className='flex w-full justify-between sm:justify-evenly'>
        {bottomToolbar.map((tool) => {
          if (tool) {
            return (
              <div key={tool.title} className="flex items-center">
                {tool.title === 'Text formating' ? (
                  <DrawerTrigger asChild>
                    <button onClick={() => tool.onClick()}>
                      {tool.icon}
                    </button>
                  </DrawerTrigger>
                ) : (
                  <button
                    className={cn("flex items-center rounded px-2 py-1 text-black transition")}
                    onClick={() => tool.onClick()}>
                    {tool.icon}
                  </button>
                )}
              </div>
            );
          }
        })}
      </div>
      {toolVisibilty === IEditorTool.TEXT_FORMATING && (
        <TextFormatingPopup
          editor={editor}
          elementRef={toolRef}
          setToolVisibility={setToolVisibility}
        />
      )}
      {toolVisibilty === IEditorTool.LINK_POPUP && (
        <LinkModal
          open={toolVisibilty === IEditorTool.LINK_POPUP}
          onOpenChange={() => setToolVisibility(IEditorTool.NONE)}
          title="Link"
          content={
            <div className="flex flex-col gap-4 w-full h-full px-4">
              <TextField
                label="Text"
                placeholder="Link text"
                className="w-full"
              />
              <TextField
                label="Title"
                placeholder="Paste URL"
                className="w-full"
              />
            </div>
          }
          primaryAction={{
            label: 'Save',
            onClick: () => null,
            isLoading: false,
            className: 'w-auto',
          }}
          secondaryAction={{
            label: 'Cancel',
            variant: 'secondary',
            onClick: () => setToolVisibility(IEditorTool.NONE),
            className: 'w-auto',
          }}
        />
      )}
    </Drawer>
  )
}

export default BottomToolbar