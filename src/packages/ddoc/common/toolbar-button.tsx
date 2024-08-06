import { IconButton, Tooltip } from '@fileverse/ui';

export default function ToolbarButton({
  icon,
  isActive,
  onClick,
  tooltip,
  classNames,
  ref,
  disabled,
}: {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
  classNames?: string;
  ref?: React.LegacyRef<HTMLButtonElement> | undefined;
  disabled?: boolean;
}) {
  if (tooltip)
    return (
      <Tooltip text={tooltip}>
        <IconButton
          ref={ref}
          variant="ghost"
          size="md"
          icon={icon}
          onClick={onClick}
          isActive={isActive}
          className={classNames}
          disabled={disabled}
        />
      </Tooltip>
    );

  return (
    <IconButton
      ref={ref}
      variant="ghost"
      size="md"
      icon={icon}
      onClick={onClick}
      isActive={isActive}
      className={classNames}
      disabled={disabled}
    />
  );
}
