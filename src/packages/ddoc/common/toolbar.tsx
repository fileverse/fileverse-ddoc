import { ButtonHTMLAttributes, HTMLProps, forwardRef } from 'react';

import clx from 'classnames';
import { Surface } from './surface';
import { Button, ButtonProps } from './button';
import CustomTooltip from './cutsom-tooltip';

export type ToolbarWrapperProps = {
  shouldShowContent?: boolean;
  isVertical?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarWrapper = forwardRef<HTMLDivElement, ToolbarWrapperProps>(
  (
    {
      shouldShowContent = true,
      children,
      isVertical = false,
      className,
      ...rest
    },
    ref
  ) => {
    const toolbarClassName = clx(
      'text-black inline-flex h-full leading-none gap-0.5',
      isVertical ? 'flex-col p-2' : 'flex-row p-1 items-center',
      className
    );

    // If shouldShowContent is false, return null instead of false
    if (!shouldShowContent) {
      return null;
    }

    return (
      shouldShowContent && (
        <Surface className={toolbarClassName} {...rest} ref={ref}>
          {children}
        </Surface>
      )
    );
  }
);

ToolbarWrapper.displayName = 'Toolbar';

export type ToolbarDividerProps = {
  horizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(
  ({ horizontal, className, ...rest }, ref) => {
    const dividerClassName = clx(
      'bg-neutral-200',
      horizontal
        ? 'w-full min-w-[1.5rem] h-[1px] my-1 first:mt-0 last:mt-0'
        : 'h-full min-h-[1.5rem] w-[1px] mx-1 first:ml-0 last:mr-0',
      className
    );

    return <div className={dividerClassName} ref={ref} {...rest} />;
  }
);

ToolbarDivider.displayName = 'Toolbar.Divider';

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  activeClassname?: string;
  tooltip?: string;
  buttonSize?: ButtonProps['buttonSize'];
  variant?: ButtonProps['variant'];
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      children,
      buttonSize = 'icon',
      variant = 'ghost',
      className,
      tooltip,
      activeClassname,
      ...rest
    },
    ref
  ) => {
    const buttonClass = clx('gap-1 min-w-[2rem] px-2 w-auto', className);

    const content = (
      <Button
        activeClassname={activeClassname}
        className={buttonClass}
        variant={variant}
        buttonSize={buttonSize}
        ref={ref}
        {...rest}
      >
        {children}
      </Button>
    );

    if (tooltip) {
      return <CustomTooltip content={tooltip}>{content}</CustomTooltip>;
    }

    return content;
  }
);

ToolbarButton.displayName = 'ToolbarButton';

export const Toolbar = {
  Wrapper: ToolbarWrapper,
  Divider: ToolbarDivider,
  Button: ToolbarButton,
};
