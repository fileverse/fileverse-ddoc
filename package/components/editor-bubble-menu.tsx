/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu, BubbleMenuProps, isNodeSelection } from '@tiptap/react';
import React, { useState } from 'react';
import { NodeSelector } from './node-selector';
import {
  LinkPopup,
  useEditorToolbar,
  TextHighlighter,
  EditorAlignment,
  TextColor,
  ScriptsPopup,
  InlineCommentPopup,
} from './editor-utils';
import { IEditorTool } from '../hooks/use-visibility';
import ToolbarButton from '../common/toolbar-button';
import { DynamicDropdown, cn } from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import platform from 'platform';
import tippy from 'tippy.js';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: any;
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  isPreviewMode: boolean;
  onError?: (errorString: string) => void;
  zoomLevel: string;
  setIsCommentSectionOpen?: (isOpen: boolean) => void;
  inlineCommentData?: InlineCommentData;
  setInlineCommentData?: React.Dispatch<
    React.SetStateAction<InlineCommentData>
  >;
  walletAddress?: string;
  username?: string;
  onInlineComment?: () => void;
};

export const EditorBubbleMenu = (props: EditorBubbleMenuProps) => {
  const [isInlineCommentOpen, setIsInlineCommentOpen] = useState(false);
  const items: BubbleMenuItem[] = [
    {
      name: 'Bold',
      isActive: () => props.editor.isActive('bold'),
      command: () => props.editor.chain().focus().toggleBold().run(),
      icon: 'Bold',
    },
    {
      name: 'Italic',
      isActive: () => props.editor.isActive('italic'),
      command: () => props.editor.chain().focus().toggleItalic().run(),
      icon: 'Italic',
    },
    {
      name: 'Underline',
      isActive: () => props.editor.isActive('underline'),
      command: () => props.editor.chain().focus().toggleUnderline().run(),
      icon: 'Underline',
    },
    {
      name: 'Strikethrough',
      isActive: () => props.editor.isActive('strike'),
      command: () => props.editor.chain().focus().toggleStrike().run(),
      icon: 'Strikethrough',
    },
    {
      name: 'Alignment',
      isActive: () => toolVisibility === IEditorTool.ALIGNMENT,
      command: () => setToolVisibility(IEditorTool.ALIGNMENT),
      icon: 'AlignLeft',
    },
    {
      name: 'Code',
      isActive: () => props.editor.isActive('code'),
      command: () => props.editor.chain().focus().toggleCode().run(),
      icon: 'Code',
    },
    {
      name: 'Link',
      isActive: () => props.editor.isActive('link'),
      command: () => {},
      icon: 'Link',
    },
    {
      name: 'Scripts',
      isActive: () => toolVisibility === IEditorTool.SCRIPTS,
      command: () => setToolVisibility(IEditorTool.SCRIPTS),
      icon: 'Superscript',
    },
    {
      name: 'InlineComment',
      isActive: () => props.editor.isActive('inlineComment'),
      command: () => {},
      icon: 'MessageSquarePlus',
    },
  ];

  const checkOs = () => platform.os?.family;

  const isMobileScreen = useMediaQuery('(max-width: 640px)');
  const isNativeMobile =
    checkOs() === 'Android' || checkOs() === 'Windows Phone' || isMobileScreen;

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    shouldShow: ({ state, editor }) => {
      const { selection } = state;
      const { empty } = selection;

      if (editor.isActive('image') || empty || isNodeSelection(selection)) {
        return false;
      }
      return true;
    },
    tippyOptions: {
      moveTransition: 'transform 0.15s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 20,
      offset: isNativeMobile ? 60 : 20,
      appendTo: () => document.getElementById('editor-canvas'),
      popperOptions: {
        modifiers: [
          {
            name: 'computeStyles',
            options: {
              gpuAcceleration: false,
              adaptive: true,
            },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 20,
              altAxis: true,
            },
          },
        ],
      },
    },
  };

  const initializeTippy = (element: HTMLElement, clientRect: DOMRect) => {
    tippy(element, {
      getReferenceClientRect: () => clientRect,
      appendTo: () => document.getElementById('editor-canvas'),
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      content: element,
      showOnCreate: true,
    });
  };

  const { toolRef, setToolVisibility, toolVisibility } = useEditorToolbar({
    editor: props.editor,
  });
  const shouldShow = ({ editor }) => {
    const { from, to } = editor.state.selection;
    const isImageSelected =
      editor.state.doc.nodeAt(from)?.type.name === 'resizableMedia';
    const isIframeSelected =
      editor.state.doc.nodeAt(from)?.type.name === 'iframe';
    const isCodeBlockSelected = editor.isActive('codeBlock');
    const isPageBreak =
      editor.state.doc.nodeAt(from)?.type.name === 'pageBreak';
    if (
      from === to ||
      isImageSelected ||
      isCodeBlockSelected ||
      isIframeSelected ||
      isPageBreak
    ) {
      return false;
    }

    let hasYellowHighlight = false;
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'highlight' && mark.attrs.color === 'yellow') {
            hasYellowHighlight = true;
          }
        });
      }
    });
    return !hasYellowHighlight;
  };

  const renderContent = (item: BubbleMenuItem) => {
    switch (item.name) {
      case 'Alignment':
        return (
          <EditorAlignment
            setToolVisibility={setToolVisibility}
            editor={props.editor}
            elementRef={toolRef}
          />
        );
      case 'Link':
        return (
          <LinkPopup
            setToolVisibility={setToolVisibility}
            editor={props.editor}
            elementRef={toolRef}
            bubbleMenu={true}
            onError={props.onError}
          />
        );
      case 'InlineComment':
        if (props.username || props.walletAddress) {
          return (
            <InlineCommentPopup
              editor={props.editor}
              elementRef={toolRef}
              setIsCommentSectionOpen={props.setIsCommentSectionOpen}
              setIsInlineCommentOpen={setIsInlineCommentOpen}
              inlineCommentData={props.inlineCommentData}
              setInlineCommentData={(data) =>
                props.setInlineCommentData?.((prev) => ({ ...prev, ...data }))
              }
              onInlineComment={props.onInlineComment}
                          />
          );
        }
        return null;
      case 'Scripts':
        return <ScriptsPopup editor={props.editor} elementRef={toolRef} />;
      default:
        return null;
    }
  };

  const isMobile = useMediaQuery('(max-width: 1023px)');

  const handleHighlight = () => {
    if (!(props.username || props.walletAddress)) {
      props.setIsCommentSectionOpen(true);
      return;
    }
    const { state } = props.editor;
    if (!state) return;
    const { from, to } = state.selection;

    const selectedText = state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;
    props.setInlineCommentData((prevData) => {
      const updatedData = {
        ...prevData,
        highlightedTextContent: selectedText,
      };
      return updatedData;
    });

    setTimeout(() => {
      props.editor.chain().setHighlight({ color: '#DDFBDF' }).run();
    }, 10);
    setIsInlineCommentOpen(true);
  };

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      shouldShow={shouldShow}
      className={cn(
        'flex gap-2 overflow-hidden rounded-lg min-w-fit w-full p-1 border bg-white items-center shadow-elevation-3',
        isInlineCommentOpen ? '!invisible' : '!visible',
      )}
      style={{
        transform: `scale(${1 / parseFloat(props.zoomLevel)})`,
        transformOrigin: 'center',
      }}
      ref={(element) => {
        if (element) {
          const clientRect = element.getBoundingClientRect();
          initializeTippy(element, clientRect);
        }
      }}
    >
      {isMobile || props.isPreviewMode ? (
        <div
          className={cn(
            'relative',
            isInlineCommentOpen ? 'left-1/2 translate-x-1/2' : '',
          )}
        >
          <DynamicDropdown
            key="InlineComment"
            side="top"
            sideOffset={-40}
            anchorTrigger={
              <ToolbarButton
                icon="MessageSquarePlus"
                variant="ghost"
                size="sm"
                onClick={() => handleHighlight()}
              />
            }
            content={renderContent({ name: 'InlineComment' })}
          />
        </div>
      ) : (
        <>
          <NodeSelector editor={props.editor} elementRef={toolRef} />

          {items.map((item, index) => {
            if (
              item.name === 'Bold' ||
              item.name === 'Italic' ||
              item.name === 'Underline' ||
              item.name === 'Strikethrough' ||
              item.name === 'Code'
            ) {
              return (
                <div key={index} className="flex items-center">
                  <ToolbarButton
                    icon={item.icon}
                    size="sm"
                    onClick={item.command}
                    isActive={item.isActive()}
                  />
                  {index === 3 && (
                    <div className="w-[1px] h-4 bg-gray-200 ml-2"></div>
                  )}
                </div>
              );
            }

            if (item.name === 'Alignment') {
              return (
                <React.Fragment key={index}>
                  <DynamicDropdown
                    key={IEditorTool.TEXT_COLOR}
                    sideOffset={15}
                    anchorTrigger={
                      <ToolbarButton
                        icon="Baseline"
                        size="sm"
                        isActive={toolVisibility === IEditorTool.TEXT_COLOR}
                      />
                    }
                    content={
                      <TextColor
                        setVisibility={setToolVisibility}
                        editor={props.editor as Editor}
                        elementRef={toolRef}
                      />
                    }
                  />
                  <DynamicDropdown
                    key={IEditorTool.HIGHLIGHT}
                    sideOffset={15}
                    anchorTrigger={
                      <ToolbarButton
                        icon="Highlighter"
                        size="sm"
                        isActive={toolVisibility === IEditorTool.HIGHLIGHT}
                      />
                    }
                    content={
                      <TextHighlighter
                        setVisibility={setToolVisibility}
                        editor={props.editor as Editor}
                        elementRef={toolRef}
                      />
                    }
                  />
                  <div className="w-[1px] h-4 bg-gray-200"></div>
                  <DynamicDropdown
                    key={item.name}
                    sideOffset={15}
                    anchorTrigger={
                      <ToolbarButton
                        icon={item.icon}
                        variant="ghost"
                        size="sm"
                        onClick={() => setToolVisibility(IEditorTool.ALIGNMENT)}
                      />
                    }
                    content={renderContent(item)}
                  />
                </React.Fragment>
              );
            }
            if (
              item.name === 'Link' ||
              item.name === 'Scripts' ||
              item.name === 'InlineComment'
            ) {
              return (
                <React.Fragment key={item.name}>
                  {item.name === 'InlineComment' && (
                    <div className="w-[1px] h-4 bg-gray-200"></div>
                  )}
                  <DynamicDropdown
                    sideOffset={isInlineCommentOpen ? 5 : 15}
                    anchorTrigger={
                      <ToolbarButton
                        icon={item.icon}
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          item.name === 'InlineComment'
                            ? handleHighlight()
                            : null
                        }
                      />
                    }
                    content={renderContent(item)}
                  />
                </React.Fragment>
              );
            }

            return null;
          })}
        </>
      )}
    </BubbleMenu>
  );
};
