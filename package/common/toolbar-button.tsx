/* eslint-disable @typescript-eslint/ban-ts-comment */
import { forwardRef } from 'react';
import { IconButton, Tooltip } from '@fileverse/ui';

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  {
    icon: string;
    isActive?: boolean;
    onClick?: () => void;
    tooltip?: string;
    classNames?: string;
    disabled?: boolean;
    variant?: 'default' | 'danger' | 'secondary' | 'ghost' | null | undefined;
    size?: 'sm' | 'md' | 'lg';
  }
>(
  (
    { icon, isActive, onClick, tooltip, classNames, disabled, size, variant },
    ref,
  ) => {
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    };

    if (tooltip)
      return (
        <Tooltip text={tooltip}>
          <IconButton
            // @ts-ignore
            ref={ref}
            variant={variant}
            size={size || 'md'}
            icon={icon}
            onClick={onClick}
            onMouseDown={handleMouseDown}
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
        onMouseDown={handleMouseDown}
        isActive={isActive}
        className={classNames}
        disabled={disabled}
      />
    );
  },
);

export default ToolbarButton;
