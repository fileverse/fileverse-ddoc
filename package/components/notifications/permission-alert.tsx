import { useState } from 'react';
import { DynamicAlertBanner } from './dynamic-alert-banner';

interface PermissionAlertProps {
  handleRejectNotifications: () => void;
  handleAcceptNotifications: () => void;
}

export const PermissionAlert = ({
  handleRejectNotifications,
  handleAcceptNotifications,
}: PermissionAlertProps) => {
  const [showBanner, setShowBanner] = useState(true);

  if (!showBanner) return null;

  return (
    <div className="fixed top-8 left-4 z-[60]">
      <DynamicAlertBanner
        open={showBanner}
        onOpenChange={(open) => setShowBanner(open)}
        icon={
          <div className="flex items-center justify-center px-[9px] py-[5px] rounded color-bg-secondary">
            <span className="text-heading-lg">🔔</span>
          </div>
        }
        iconAlignment="center"
        title="Turn on notifications to for reminders"
        description={
          <div className="flex flex-col gap-2">
            <p>
              Notifications can be turned off anytime in your browser settings.
              Only for reminders.
            </p>
          </div>
        }
        footer={
          <div className="border-t color-border-default">
            <div className="flex justify-center items-center color-text-default text-helper-text-sm-bold">
              <button
                className="w-full h-[46px] flex justify-center items-center gap-1 hover:color-bg-secondary-hover transition-all color-text-danger"
                onClick={handleRejectNotifications}
              >
                Not now
              </button>
              <button
                className="w-full h-[46px] flex justify-center items-center gap-1 hover:color-bg-secondary-hover transition-all color-text-success"
                onClick={handleAcceptNotifications}
              >
                Okay, Turn on!
              </button>
            </div>
          </div>
        }
        variant="default"
        className="max-w-[320px] border color-border-default shadow-elevation-4 flex flex-col gap-2 !px-0 !pb-0"
        contentClassName="px-3"
      />
    </div>
  );
};
