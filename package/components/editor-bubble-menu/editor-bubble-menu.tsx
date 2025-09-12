/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu } from '@tiptap/react';
import React from 'react';
import { NodeSelector } from './node-selector';
import {
  LinkPopup,
  useEditorToolbar,
  TextHighlighter,
  EditorAlignment,
  TextColor,
  ScriptsPopup,
  getCurrentFontSize,
  FontSizePicker,
} from '../editor-utils';
import { IEditorTool } from '../../hooks/use-visibility';
import ToolbarButton from '../../common/toolbar-button';
import { DynamicDropdown, cn, LucideIcon } from '@fileverse/ui';
import { CommentDropdown } from '../inline-comment/comment-dropdown';
import { createPortal } from 'react-dom';
import { EditorBubbleMenuProps, BubbleMenuItem } from './types';
import { useResponsive } from '../../utils/responsive';
import { bubbleMenuProps, shouldShow } from './props';
import { useComments } from '../inline-comment/context/comment-context';
import { useEditorStates } from '../../hooks/use-editor-states';
import { Editor } from '@tiptap/react';
import { ReminderMenu } from '../../extensions/reminder-block/reminder-menu';
import { useReminder } from '../../hooks/use-reminder';

const MemoizedFontSizePicker = React.memo(FontSizePicker);

export const EditorBubbleMenu = (props: EditorBubbleMenuProps) => {
  const {
    editor,
    zoomLevel,
    onError,
    isPreviewMode,
    setCommentDrawerOpen,
    activeCommentId,
    isCollabDocumentPublished,
    disableInlineComment,
    onReminderCreate,
    isConnected,
    ipfsImageUploadFn,
    ipfsImageFetchFn,
    isCollabDocOwner,
    enableCollaboration,
  } = props;
  const editorStates = useEditorStates(editor as Editor);
  const currentSize = editor ? editorStates.currentSize : undefined;
  const onSetFontSize = editor ? editorStates.onSetFontSize : () => {};
  const { isNativeMobile } = useResponsive();
  const { toolRef, setToolVisibility, toolVisibility } = useEditorToolbar({
    editor: editor,
    onError,
    ipfsImageUploadFn,
    ipfsImageFetchFn,
  });

  const {
    reminderRef,
    handleReminderOnClose,
    handleReminderCreate,
    initialReminderTitle,
    setInitialReminderTitle,
  } = useReminder({
    editor,
    onReminderCreate,
    onError,
  });

  const {
    activeComment,
    isCommentOpen,
    handleInlineComment,
    portalRef,
    buttonRef,
    isCommentActive,
    isCommentResolved,
  } = useComments();

  const items: BubbleMenuItem[] = [
    {
      name: 'Bold',
      isActive: () => editor.isActive('bold'),
      command: () => editor.chain().focus().toggleBold().run(),
      icon: 'Bold',
    },
    {
      name: 'Italic',
      isActive: () => editor.isActive('italic'),
      command: () => editor.chain().focus().toggleItalic().run(),
      icon: 'Italic',
    },
    {
      name: 'Underline',
      isActive: () => editor.isActive('underline'),
      command: () => editor.chain().focus().toggleUnderline().run(),
      icon: 'Underline',
    },
    {
      name: 'Strikethrough',
      isActive: () => editor.isActive('strike'),
      command: () => editor.chain().focus().toggleStrike().run(),
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
      isActive: () => editor.isActive('code'),
      command: () => editor.chain().focus().toggleCode().run(),
      icon: 'Code',
    },
    {
      name: 'Link',
      isActive: () => editor.isActive('link'),
      command: () => setToolVisibility(IEditorTool.LINK_POPUP),
      icon: 'Link',
    },
    {
      name: 'Scripts',
      isActive: () => toolVisibility === IEditorTool.SCRIPTS,
      command: () => setToolVisibility(IEditorTool.SCRIPTS),
      icon: 'Superscript',
    },
    {
      name: 'Reminder',
      isActive: () => false,
      command: () => {
        const selectedText =
          editor.state.selection.content().content.firstChild?.textContent ||
          '';
        if (setInitialReminderTitle) {
          setInitialReminderTitle(selectedText);
        }
      },
      icon: 'AlarmClock',
    },
    {
      name: 'Comment',
      isActive: () => isCommentActive,
      command: () => {},
      icon: 'MessageSquarePlus',
    },
  ];

  const renderContent = (item: { name: string; initialComment?: string }) => {
    switch (item.name) {
      case 'Alignment':
        return (
          <EditorAlignment
            setToolVisibility={setToolVisibility}
            editor={editor}
            elementRef={toolRef}
          />
        );
      case 'Link':
        return (
          <LinkPopup
            setToolVisibility={setToolVisibility}
            editor={editor}
            elementRef={toolRef}
            bubbleMenu={true}
            onError={onError}
          />
        );
      case 'Comment':
        return (
          <CommentDropdown
            activeCommentId={activeCommentId}
            setCommentDrawerOpen={setCommentDrawerOpen}
            initialComment={item.initialComment}
            isDisabled={
              activeComment && !Object.hasOwn(activeComment, 'commentIndex')
            }
          />
        );
      case 'Scripts':
        return <ScriptsPopup editor={editor} elementRef={toolRef} />;
      case 'Reminder':
        return (
          <ReminderMenu
            ref={reminderRef}
            type={'inline'}
            isOpen={true}
            onClose={handleReminderOnClose}
            onCreateReminder={handleReminderCreate}
            initialReminderTitle={initialReminderTitle}
            setInitialReminderTitle={setInitialReminderTitle}
          />
        );
      default:
        return null;
    }
  };

  const mobileCommentButton = (
    <React.Fragment>
      <ToolbarButton
        ref={buttonRef}
        icon="MessageSquarePlus"
        variant="ghost"
        size="sm"
        disabled={
          isCommentResolved ||
          !isCollabDocumentPublished ||
          disableInlineComment
        }
        isActive={isCommentActive}
        onClick={handleInlineComment}
        classNames="disabled:!bg-transparent"
      />
      {isCommentOpen &&
        isCollabDocOwner &&
        createPortal(
          <div
            ref={portalRef}
            className={cn(
              'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 rounded-md border color-border-default color-bg-default shadow-elevation-3',
            )}
          >
            {renderContent({
              name: 'Comment',
              initialComment: activeComment?.content || '',
            })}
          </div>,
          document.body,
        )}
    </React.Fragment>
  );

  return (
    <BubbleMenu
      {...bubbleMenuProps(props)}
      shouldShow={shouldShow}
      className={cn(
        'flex gap-2 overflow-hidden rounded-lg min-w-fit w-full p-1 border color-bg-default items-center shadow-elevation-3',
        isCommentOpen || toolVisibility === IEditorTool.LINK_POPUP
          ? '!invisible'
          : '!visible',
        isNativeMobile ? '!-translate-y-[120%]' : '',
      )}
      style={{
        transform: `scale(${1 / parseFloat(zoomLevel)})`,
        transformOrigin: 'center',
      }}
    >
      {isNativeMobile ? (
        <div
          className={cn(
            'relative',
            isCommentOpen ? 'left-1/2 translate-x-1/2' : '',
          )}
        >
          {mobileCommentButton}
          {isConnected && !enableCollaboration && (
            <DynamicDropdown
              key="Reminder"
              side="bottom"
              sideOffset={15}
              anchorTrigger={
                <ToolbarButton
                  icon={'AlarmClock'}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selectedText =
                      editor.state.selection.content().content.firstChild
                        ?.textContent || '';
                    if (setInitialReminderTitle) {
                      setInitialReminderTitle(selectedText);
                    }
                  }}
                  disabled={!isConnected}
                />
              }
              className="!max-w-[300px] border-none shadow-none"
              content={renderContent({ name: 'Reminder' })}
            />
          )}
        </div>
      ) : (
        <React.Fragment>
          {isPreviewMode ? (
            <DynamicDropdown
              key="Comment"
              side="bottom"
              sideOffset={15}
              alignOffset={-5}
              align="end"
              className="!z-[50] shadow-elevation-3"
              anchorTrigger={
                <ToolbarButton
                  icon="MessageSquarePlus"
                  variant="ghost"
                  size="sm"
                  tooltip={isCommentResolved ? 'Comment resolved' : ''}
                  disabled={
                    isCommentResolved ||
                    !isCollabDocumentPublished ||
                    disableInlineComment
                  }
                  isActive={isCommentActive}
                  onClick={handleInlineComment}
                  classNames="disabled:!bg-transparent"
                />
              }
              content={
                !isCommentActive
                  ? renderContent({
                      name: 'Comment',
                      initialComment: activeComment?.content || '',
                    })
                  : null
              }
            />
          ) : (
            <React.Fragment>
              <NodeSelector editor={editor} elementRef={toolRef} />

              <div className="w-[1px] h-4 vertical-divider"></div>

              <DynamicDropdown
                key={IEditorTool.FONT_SIZE}
                sideOffset={8}
                anchorTrigger={
                  <button
                    className="bg-transparent hover:!color-bg-default-hover rounded gap-2 py-2 px-1 flex items-center justify-center w-fit max-w-14 min-w-14"
                    onClick={() => setToolVisibility(IEditorTool.FONT_SIZE)}
                  >
                    <span className="text-body-sm line-clamp-1">
                      {getCurrentFontSize(editor, currentSize as string)}
                    </span>
                    <LucideIcon name="ChevronDown" size="sm" />
                  </button>
                }
                content={
                  <MemoizedFontSizePicker
                    setVisibility={setToolVisibility}
                    editor={editor as Editor}
                    elementRef={toolRef}
                    currentSize={currentSize}
                    onSetFontSize={onSetFontSize}
                  />
                }
              />

              <div className="w-[1px] h-4 vertical-divider"></div>

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
                        <div className="w-[1px] h-4 vertical-divider ml-2"></div>
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
                            editor={editor as Editor}
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
                            editor={editor as Editor}
                            elementRef={toolRef}
                          />
                        }
                      />
                      <div className="w-[1px] h-4 vertical-divider"></div>
                      <DynamicDropdown
                        key={item.name}
                        sideOffset={15}
                        anchorTrigger={
                          <ToolbarButton
                            icon={item.icon}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setToolVisibility(IEditorTool.ALIGNMENT)
                            }
                          />
                        }
                        className="shadow-elevation-3"
                        content={renderContent(item)}
                      />
                    </React.Fragment>
                  );
                }

                if (item.name === 'Link' || item.name === 'Scripts') {
                  return (
                    <React.Fragment key={item.name}>
                      <DynamicDropdown
                        sideOffset={15}
                        anchorTrigger={
                          <ToolbarButton
                            icon={item.icon}
                            variant="ghost"
                            size="sm"
                            onClick={item.command}
                          />
                        }
                        className="shadow-elevation-3"
                        content={renderContent(item)}
                      />
                    </React.Fragment>
                  );
                }

                if (item.name === 'Comment') {
                  return (
                    <DynamicDropdown
                      key="Comment"
                      side="bottom"
                      sideOffset={15}
                      alignOffset={-5}
                      align="end"
                      className="!z-[50] shadow-elevation-3"
                      anchorTrigger={
                        <ToolbarButton
                          ref={buttonRef}
                          icon="MessageSquarePlus"
                          variant="ghost"
                          size="sm"
                          tooltip={
                            enableCollaboration
                              ? 'Comments are not available during real-time  collaboration'
                              : isCommentResolved
                                ? 'Comment resolved'
                                : ''
                          }
                          disabled={
                            isCommentResolved ||
                            !isCollabDocumentPublished ||
                            disableInlineComment ||
                            enableCollaboration
                          }
                          isActive={isCommentActive}
                          onClick={handleInlineComment}
                          classNames="disabled:!bg-transparent"
                        />
                      }
                      content={
                        !isCommentActive
                          ? renderContent({
                              name: 'Comment',
                              initialComment: activeComment?.content || '',
                            })
                          : null
                      }
                    />
                  );
                }

                if (item.name === 'Reminder') {
                  return (
                    isConnected &&
                    isCollabDocOwner && (
                      <DynamicDropdown
                        key="Reminder"
                        side="bottom"
                        sideOffset={15}
                        anchorTrigger={
                          <ToolbarButton
                            icon={item.icon}
                            variant="ghost"
                            disabled={!isConnected || enableCollaboration}
                            size="sm"
                            onClick={item.command}
                            classNames="disabled:!bg-transparent"
                            tooltip={
                              enableCollaboration
                                ? 'Reminders are not available during real-time collaboration'
                                : ''
                            }
                          />
                        }
                        className="!max-w-[300px] border-none shadow-none"
                        content={renderContent(item)}
                      />
                    )
                  );
                }

                return null;
              })}
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </BubbleMenu>
  );
};
