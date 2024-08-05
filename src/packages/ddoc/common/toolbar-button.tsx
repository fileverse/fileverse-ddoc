import { IconButton, Tooltip } from '@fileverse/ui';

export default function ToolbarButton({
  icon,
  isActive,
  onClick,
  tooltip,
}: {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
}) {
  if (tooltip)
    return (
      <Tooltip text={tooltip}>
        <IconButton
          variant="ghost"
          size="md"
          icon={icon}
          onClick={onClick}
          className={isActive ? '!bg-yellow-300 hover:!brightness-90' : ''}
        />
      </Tooltip>
    );

  return (
    <IconButton
      variant="ghost"
      size="md"
      icon={icon}
      onClick={onClick}
      className={isActive ? '!bg-yellow-300 hover:!brightness-90' : ''}
    />
  );
}
