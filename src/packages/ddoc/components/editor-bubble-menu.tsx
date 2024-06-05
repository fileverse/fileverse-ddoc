/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu, BubbleMenuProps, isNodeSelection } from '@tiptap/react'
import cx from 'classnames'
import { FC, useState } from 'react'
import format_bold from '../../../assets/dpage/bold.svg'
import format_italic from '../../../assets/dpage/italic.svg'
import format_underline from '../../../assets/dpage/underline.svg'
import code from '../../../assets/dpage/code.svg'
import strikethrough from '../../../assets/dpage/strikethrough.svg'
import link from '../../../assets/dpage/link.svg'

import { NodeSelector } from './node-selector'
import { ColorSelector } from '../components/color-selector'
import { LinkPopup, useEditorToolbar } from './editor-utils'

export interface BubbleMenuItem {
  name: string
  isActive: () => boolean
  command: () => void
  icon: any
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'>

export const EditorBubbleMenu: FC<EditorBubbleMenuProps> = (props) => {
  const items: BubbleMenuItem[] = [
    {
      name: 'bold',
      isActive: () => props.editor.isActive('bold'),
      command: () => props.editor.chain().focus().toggleBold().run(),
      icon: format_bold,
    },
    {
      name: 'italic',
      isActive: () => props.editor.isActive('italic'),
      command: () => props.editor.chain().focus().toggleItalic().run(),
      icon: format_italic,
    },
    {
      name: 'underline',
      isActive: () => props.editor.isActive('underline'),
      // @ts-ignore
      command: () => props.editor.chain().focus().toggleUnderline().run(),
      icon: format_underline,
    },
    {
      name: 'strike',
      isActive: () => props.editor.isActive('strike'),
      command: () => props.editor.chain().focus().toggleStrike().run(),
      icon: strikethrough,
    },
    {
      name: 'codeBlock',
      isActive: () => props.editor.isActive('codeBlock'),
      command: () => props.editor.chain().focus().toggleCodeBlock().run(),
      icon: code,
    },
    {
      name: 'link',
      isActive: () => props.editor.isActive('link'),
      command: () => setIsLinkPopupOpen(!isLinkPopupOpen),
      icon: link,
    },
  ]

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    shouldShow: ({ state, editor }) => {
      const { selection } = state
      const { empty } = selection

      // don't show bubble menu if:
      // - the selected node is an image
      // - the selection is empty
      // - the selection is a node selection (for drag handles)
      if (editor.isActive('image') || empty || isNodeSelection(selection)) {
        return false
      }
      return true
    },
    tippyOptions: {
      moveTransition: 'transform 0.15s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      onHidden: () => {
        setIsNodeSelectorOpen(false)
        setIsColorSelectorOpen(false)
        setIsLinkPopupOpen(false)
      },
    },
  }

  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false)
  const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false)
  const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false)

  const { toolRef, setToolVisibility } = useEditorToolbar({
    // @ts-ignore
    editor: props.editor,
  })

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="flex gap-1 overflow-hidden rounded border border-stone-200 bg-white shadow-xl"
    >
      <NodeSelector
        // @ts-ignore
        editor={props.editor}
        isOpen={isNodeSelectorOpen}
        setIsOpen={() => {
          setIsNodeSelectorOpen(!isNodeSelectorOpen)
          setIsColorSelectorOpen(false)
        }}
      />

      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.command}
          className=" py-2 text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        >
          <img
            src={item.icon}
            className={cx(' p-1 rounded-lg h-6 w-6', {
              'bg-yellow-300': item.isActive(),
            })}
          />
        </button>
      ))}
      <ColorSelector
        // @ts-ignore
        editor={props.editor}
        isOpen={isColorSelectorOpen}
        setIsOpen={() => {
          setIsColorSelectorOpen(!isColorSelectorOpen)
          setIsNodeSelectorOpen(false)
        }}
      />
      {isLinkPopupOpen && (
        <LinkPopup
          setToolVisibility={setToolVisibility}
          // @ts-ignore
          editor={props.editor}
          elementRef={toolRef}
          bubbleMenu={true}
          setIsLinkPopupOpen={setIsLinkPopupOpen}
        />
      )}
    </BubbleMenu>
  )
}
