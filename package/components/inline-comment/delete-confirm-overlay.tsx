import { Button, cn } from '@fileverse/ui';

export const DeleteConfirmOverlay = ({
  isVisible,
  title,
  onCancel,
  onConfirm,
  className,
}: {
  isVisible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col rounded-[12px] items-center justify-center gap-[12px] bg-black/75',
        className,
      )}
    >
      <p className="color-text-inverse text-heading-xsm">{title}</p>
      <div className="flex gap-[8px]">
        <Button
          className="!min-w-[80px] color-text-inverse hover:text-black !h-[30px] !w-[80px]"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="!min-w-[80px] !h-[30px] !w-[80px]"
          variant="danger"
          onClick={onConfirm}
        >
          Delete
        </Button>
      </div>
    </div>
  );
};
