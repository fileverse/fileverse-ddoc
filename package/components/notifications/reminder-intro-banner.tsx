import { Button } from '@fileverse/ui';
import { DynamicAlertBanner } from './dynamic-alert-banner';
import { ReminderLottie } from './reminder-lottie';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';

interface ReminderIntroBannerProps {
  onClose: () => void;
  editor: Editor;
}

export const ReminderIntroBanner = ({
  onClose,
  editor,
}: ReminderIntroBannerProps) => {
  const editorElement = document.getElementById('editor-wrapper');
  const isDocumentEmpty = editor?.isEmpty;
  if (!editorElement || !isDocumentEmpty) return null;

  // Handle Try Reminders click
  const handleTryReminders = () => {
    onClose();
    // Trigger the slash command for reminders "/reminder" on the editor
    editor.chain().focus().insertContent('/reminder').run();
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="absolute left-[9%] top-[22%] z-[60]"
    >
      <DynamicAlertBanner
        icon={<ReminderLottie />}
        iconAlignment="center"
        title="Reminders to not forget anything"
        description="Forgot to fix your document or answer to a colleague comment? dDocs will remind you 💛"
        footer={
          <div className="flex justify-center items-center color-text-default text-helper-text-sm-bold">
            <Button className="w-full mx-2 mb-2" onClick={handleTryReminders}>
              Try reminders
            </Button>
          </div>
        }
        variant="default"
        className="max-w-[320px] border color-border-default shadow-elevation-4 flex flex-col gap-2 !px-0 !pb-0"
        contentClassName="px-2 flex-col"
        onOpenChange={onClose}
      />
    </motion.div>
  );

  return createPortal(content, editorElement);
};
