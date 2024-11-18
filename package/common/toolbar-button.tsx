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
  size?: "sm" | "md" | "lg";
}>(({
  icon,
  isActive,
  onClick,
  tooltip,
  classNames,
  disabled,
  size,
}, ref) => {
  if (tooltip)
    return (
      <Tooltip text={tooltip}>
        <IconButton
          // @ts-ignore
          ref={ref}
          variant="ghost"
          size={size || 'md'}
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
      size={size || 'md'}
      icon={icon}
      onClick={onClick}
      isActive={isActive}
      className={classNames}
      disabled={disabled}
    />
  );
});

export default ToolbarButton;