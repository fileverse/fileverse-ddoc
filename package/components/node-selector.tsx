import React from 'react';
import { Editor } from '@tiptap/core'
import cn from 'classnames'
import { BubbleMenuItem } from './editor-bubble-menu'
import { DynamicDropdown, LucideIcon } from '@fileverse/ui';

interface NodeSelectorProps {
  editor: Editor
  elementRef: React.RefObject<HTMLDivElement>;
}

export const NodeSelector = ({
  editor,
  elementRef
}: NodeSelectorProps) => {
  const items: BubbleMenuItem[] = [
    {
      name: 'Text',
      icon: 'Type',
      command: () =>
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run(),
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList'),
    },
    {
      name: 'Heading 1',
      icon: 'Heading1',
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      name: 'Heading 2',
      icon: 'Heading2',
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      name: 'Heading 3',
      icon: 'Heading3',
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      name: 'To-do List',
      icon: 'ListChecks',
      command: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskItem'),
    },
    {
      name: 'Bullet List',
      icon: 'ListOrdered',
      command: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      name: 'Numbered List',
      icon: 'ListOrdered',
      command: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      name: 'Quote',
      icon: 'TextQuote',
      command: () =>
        editor
          .chain()
          .focus()
          .toggleNode('paragraph', 'paragraph')
          .toggleBlockquote()
          .run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      name: 'Code Block',
      icon: 'Braces',
      command: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
  ]

  const activeItem = items.filter((item) => item.isActive()).pop() ?? {
    name: 'Multiple',
  }

  return (
    <DynamicDropdown
      key="NodeSelector"
      sideOffset={15}
      anchorTrigger={
        <button
          className="bg-transparent hover:!bg-[#F2F4F5] !text-stone-600 rounded p-2 flex items-center justify-between gap-2 w-fit max-w-36"
        >
          <span className="text-body-sm text-stone-600 truncate">{activeItem.name}</span>
          <LucideIcon name="ChevronDown" size="sm" />
        </button>
      }
      content={
        <div
          ref={elementRef}
          className="h-auto flex w-48 flex-col overflow-hidden rounded bg-white p-1 shadow-elevation-2">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.command()
              }}
              className={cn(
                'flex items-center justify-between rounded-sm px-2 py-1 text-sm text-stone-600 hover:bg-stone-100',
                {
                  'text-blue-600': item.isActive(),
                }
              )}
            >
              <div className="flex items-center space-x-2">
                <div className="rounded-sm border border-stone-200 p-1">
                  <LucideIcon name={item.icon} size="sm" />
                </div>
                <span>{item.name}</span>
              </div>
              {activeItem.name === item.name && <LucideIcon name="Check" size="sm" />}
            </button>
          ))}
        </div>
      }
    />
  )
}
