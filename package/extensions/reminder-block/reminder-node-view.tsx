import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import {
  LucideIcon,
  IconButton,
  cn,
  DynamicDropdown,
  Tooltip,
} from '@fileverse/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { formatDateForReminder } from './utils';

export const ReminderNodeView = memo(
  ({ node, editor, deleteNode }: NodeViewProps) => {
    const reminder = node.attrs.reminder;
    const [isOverdue, setIsOverdue] = useState(
      reminder?.timestamp
        ? new Date(reminder.timestamp).getTime() < Date.now()
        : false,
    );

    const isPreviewMode = editor.isEditable === false;

    // Get all reminders in the document and sort them by timestamp
    const getAllReminders = useCallback(() => {
      const reminders: { id: string; timestamp: string }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'reminderBlock') {
          reminders.push({
            id: node.attrs.reminder.id,
            timestamp: node.attrs.reminder.timestamp,
          });
        }
      });
      return reminders.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }, [editor]);

    // Navigate to the next/previous reminder
    const navigateToReminder = useCallback(
      (direction: 'next' | 'prev') => {
        const reminders = getAllReminders();
        const currentIndex = reminders.findIndex((r) => r.id === reminder.id);

        if (currentIndex === -1) return;

        let targetIndex: number;
        if (direction === 'next') {
          targetIndex = (currentIndex + 1) % reminders.length;
        } else {
          targetIndex =
            (currentIndex - 1 + reminders.length) % reminders.length;
        }

        const targetReminder = reminders[targetIndex];

        // Find the target reminder node in the document
        editor.state.doc.descendants((node, pos) => {
          if (
            node.type.name === 'reminderBlock' &&
            node.attrs.reminder.id === targetReminder.id
          ) {
            // Scroll the target reminder into view
            const domNode = editor.view.nodeDOM(pos) as HTMLElement;
            if (domNode) {
              domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Find and click the dropdown trigger to open it
              const trigger = domNode.querySelector('[data-trigger]');
              if (trigger instanceof HTMLElement) {
                trigger.click();
              }
            }
          }
        });
      },
      [editor, reminder.id, getAllReminders],
    );

    useEffect(() => {
      if (!isOverdue) {
        const now = Date.now();
        const target = new Date(reminder.timestamp).getTime();
        const delay = target - now;

        // If already overdue or due now
        if (delay <= 0) {
          setIsOverdue(true);
          return;
        }

        const timeoutId = setTimeout(() => {
          setIsOverdue(true);
        }, delay);

        // Clean up timeout on unmount or if dependencies change
        return () => clearTimeout(timeoutId);
      }
    }, [isOverdue, reminder.timestamp]);

    const handleDelete = useCallback(() => {
      const extensionOptions = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'reminderBlock',
      )?.options;

      if (extensionOptions?.onReminderDelete) {
        extensionOptions.onReminderDelete(reminder?.id);
      }
      deleteNode();
    }, [editor, reminder?.id, deleteNode]);

    if (!reminder) return null;

    return (
      <NodeViewWrapper
        as="span"
        className={cn(
          'inline-block align-baseline !font-normal select-none',
          isPreviewMode && 'hidden',
        )}
        contentEditable={false}
      >
        <DynamicDropdown
          key={reminder.id}
          sideOffset={10}
          align="start"
          anchorTrigger={
            <div
              data-trigger
              className={cn(
                'relative flex w-fit min-h-6 items-center gap-2 py-1 pl-2 rounded-full border border-dashed',
                isOverdue ? 'reminder-wrapper-overdue' : 'reminder-wrapper',
              )}
            >
              <div className="flex-1 flex items-center gap-1 max-w-[200px] min-w-max">
                {reminder.status === 'pending' ? (
                  <Tooltip
                    text={
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-body-sm">Uploading on-chain</p>
                        <span className="text-helper-text-sm color-text-secondary">
                          This may take a few minutes
                        </span>
                      </div>
                    }
                  >
                    <LucideIcon
                      name="LoaderCircle"
                      size="sm"
                      className="animate-spin reminder-wrapper-text"
                    />
                  </Tooltip>
                ) : (
                  <LucideIcon
                    name="AlarmClock"
                    size="sm"
                    className={cn(
                      isOverdue
                        ? 'reminder-wrapper-text-overdue'
                        : 'reminder-wrapper-text',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'text-xs',
                    isOverdue
                      ? 'reminder-wrapper-text-overdue'
                      : 'reminder-wrapper-text',
                  )}
                >
                  {isOverdue ? 'Overdue since ' : ''}
                  {formatDateForReminder(reminder.timestamp)}
                </span>
              </div>

              {isOverdue && (
                <IconButton
                  icon="X"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="absolute right-0 reminder-wrapper-text-overdue !bg-transparent"
                />
              )}
            </div>
          }
          className="shadow-elevation-3"
          content={
            <div className="p-2 min-w-[320px] color-bg-default space-y-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3
                    title={reminder.title}
                    className="text-body-sm-bold truncate max-w-[180px]"
                  >
                    {reminder.title}
                  </h3>
                  <span className="text-helper-text-sm color-text-secondary">
                    {isOverdue ? 'Overdue since ' : ''}
                    {formatDateForReminder(reminder.timestamp)}
                  </span>
                </div>

                {reminder.status !== 'pending' && (
                  <div className="flex items-center">
                    <IconButton
                      icon="ChevronUp"
                      variant="ghost"
                      size="sm"
                      className="color-text-default disabled:!bg-transparent"
                      onClick={() => navigateToReminder('prev')}
                    />
                    <IconButton
                      icon="ChevronDown"
                      variant="ghost"
                      size="sm"
                      className="color-text-default disabled:!bg-transparent"
                      onClick={() => navigateToReminder('next')}
                    />
                    <IconButton
                      icon="Trash2"
                      variant="ghost"
                      size="sm"
                      className="color-text-default"
                      onClick={handleDelete}
                    />
                  </div>
                )}
              </div>
            </div>
          }
        />
      </NodeViewWrapper>
    );
  },
);
