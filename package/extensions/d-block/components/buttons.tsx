import React, { forwardRef } from 'react';
import { Button, LucideIcon, PopoverClose, cn } from '@fileverse/ui';

// Memoized button components to prevent unnecessary re-renders
export const ActionButton = React.memo(
  forwardRef<
    HTMLButtonElement,
    {
      onClick: () => void;
      icon: string;
      text: string;
      variant?: 'ghost';
      className?: string;
    }
  >(({ onClick, icon, text, variant = 'ghost', className = '' }, ref) => (
    <PopoverClose asChild>
      <Button
        ref={ref}
        variant={variant}
        onClick={onClick}
        className={`justify-start gap-2 ${className}`}
      >
        <LucideIcon name={icon} size="sm" />
        {text}
      </Button>
    </PopoverClose>
  )),
);

ActionButton.displayName = 'ActionButton';

export const GripButton = React.memo(
  forwardRef<
    HTMLDivElement,
    {
      onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
      className: string;
    }
  >(({ onClick, className, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      contentEditable={false}
      draggable
      data-drag-handle
      {...props}
      onClick={onClick}
    >
      <LucideIcon name="GripVertical" size="sm" />
    </div>
  )),
);

GripButton.displayName = 'GripButton';

export const PlusButton = React.memo(
  forwardRef<
    HTMLDivElement,
    {
      onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
      className: string;
    }
  >(({ onClick, className, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      contentEditable={false}
      {...props}
      onClick={onClick}
    >
      <LucideIcon name="Plus" size="sm" />
    </div>
  )),
);

PlusButton.displayName = 'PlusButton';

export const CollapseButton = React.memo(
  forwardRef<
    HTMLDivElement,
    {
      isCollapsed: boolean;
      onToggle: () => void;
      className: string;
    }
  >(({ isCollapsed, onToggle, className, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      contentEditable={false}
      data-test="collapse-button"
      {...props}
      onClick={onToggle}
    >
      <LucideIcon
        name={isCollapsed ? 'ChevronRight' : 'ChevronDown'}
        size="sm"
      />
    </div>
  )),
);

CollapseButton.displayName = 'CollapseButton';

export const CopyLinkButton = React.memo(
  forwardRef<HTMLDivElement, { onClick: () => void; className: string }>(
    ({ onClick, className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn(className)}
        contentEditable={false}
        data-test="copy-heading-link-button"
        {...props}
        onClick={onClick}
      >
        <LucideIcon name="Link" size="sm" />
      </div>
    ),
  ),
);

CopyLinkButton.displayName = 'CopyLinkButton';
