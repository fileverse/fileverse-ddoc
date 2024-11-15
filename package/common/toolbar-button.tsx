/* eslint-disable @typescript-eslint/ban-ts-comment */
import { forwardRef } from 'react';
import { IconButton, Tooltip } from '@fileverse/ui';

const ToolbarButton = forwardRef<HTMLButtonElement, {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
  classNames?: string;
  disabled?: boolean;
}>(({
  icon,
  isActive,
  onClick,
  tooltip,
  classNames,
  disabled,
}, ref) => {
  if (tooltip)
    return (
      <Tooltip text={tooltip}>
        <IconButton
          // @ts-ignore
          ref={ref}
          variant="ghost"
          size="sm"
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
      // @ts-ignore
      ref={ref}
      variant="ghost"
      size="sm"
      icon={icon}
      onClick={onClick}
      isActive={isActive}
      className={classNames}
      disabled={disabled}
    />
  );
});

export default ToolbarButton;