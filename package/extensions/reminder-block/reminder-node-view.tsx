import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { LucideIcon, IconButton, cn, DynamicDropdown } from '@fileverse/ui';
import { useCallback } from 'react';
import { formatDateForReminder } from './utils';

export const ReminderNodeView = ({
  node,
  editor,
  deleteNode,
}: NodeViewProps) => {
  const reminder = node.attrs.reminder;

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

  const isOverdue = reminder.timestamp < Date.now();

  return (
    <NodeViewWrapper
      as="span"
      className="inline-block align-baseline !font-normal"
      contentEditable={false}
    >
      <DynamicDropdown
        key={reminder.id}
        sideOffset={10}
        align="start"
        anchorTrigger={
          <div
            className={cn(
              'relative flex w-fit min-h-6 items-center gap-2 py-1 pl-2 rounded-full border border-dashed',
              isOverdue ? 'reminder-wrapper-overdue' : 'reminder-wrapper',
            )}
          >
            <div className="flex-1 flex items-center gap-1">
              <LucideIcon
                name="AlarmClock"
                size="sm"
                className={cn(
                  isOverdue
                    ? 'reminder-wrapper-text-overdue'
                    : 'reminder-wrapper-text',
                )}
              />
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

              <div className="flex items-center">
                <IconButton
                  icon="ChevronUp"
                  variant="ghost"
                  size="sm"
                  className="color-text-secondary"
                />
                <IconButton
                  icon="ChevronDown"
                  variant="ghost"
                  size="sm"
                  className="color-text-secondary"
                />
                <IconButton
                  icon="Trash2"
                  variant="ghost"
                  size="sm"
                  className="color-text-default"
                  onClick={handleDelete}
                />
              </div>
            </div>
          </div>
        }
      />
    </NodeViewWrapper>
  );
};
