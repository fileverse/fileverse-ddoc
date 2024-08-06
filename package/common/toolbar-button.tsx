import { cn, IconButton, Tooltip } from '@fileverse/ui';

export default function ToolbarButton({
  icon,
  isActive,
  onClick,
  tooltip,
  classNames,
}: {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
  classNames?: string;
}) {
  if (tooltip)
    return (
      <Tooltip text={tooltip}>
        <IconButton
          variant="ghost"
          size="md"
          icon={icon}
          onClick={onClick}
          className={cn(
            classNames,
            isActive ? '!bg-yellow-300 hover:!brightness-90 p-2 rounded' : '',
          )}
        />
      </Tooltip>
    );

  return (
    <IconButton
      variant="ghost"
      size="md"
      icon={icon}
      onClick={onClick}
      className={cn(
        classNames,
        isActive ? '!bg-yellow-300 hover:!brightness-90' : '',
      )}
    />
  );
}
