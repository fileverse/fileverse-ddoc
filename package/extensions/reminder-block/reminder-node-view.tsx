import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { LucideIcon, IconButton, cn } from '@fileverse/ui';
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
    </NodeViewWrapper>
  );
};
