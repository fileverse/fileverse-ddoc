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
  ({
    onClick,
    className,
  }: {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    className: string;
  }) => (
    <div
      className={className}
      contentEditable={false}
      draggable
      data-drag-handle
      onClick={onClick}
    >
      <LucideIcon name="GripVertical" size="sm" />
    </div>
  ),
);

export const PlusButton = React.memo(
  ({
    onClick,
    className,
  }: {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    className: string;
  }) => (
    <div className={className} contentEditable={false} onClick={onClick}>
      <LucideIcon name="Plus" size="sm" />
    </div>
  ),
);

export const CollapseButton = React.memo(
  ({
    isCollapsed,
    onToggle,
    className,
  }: {
    isCollapsed: boolean;
    onToggle: () => void;
    className: string;
  }) => (
    <div
      className={className}
      contentEditable={false}
      onClick={onToggle}
      data-test="collapse-button"
    >
      <LucideIcon
        name={isCollapsed ? 'ChevronRight' : 'ChevronDown'}
        size="sm"
      />
    </div>
  ),
);

export const CopyLinkButton = React.memo(
  ({ onClick, className }: { onClick: () => void; className: string }) => (
    <div
      className={cn(className)}
      contentEditable={false}
      onClick={onClick}
      data-test="copy-heading-link-button"
    >
      <LucideIcon name="Link" size="sm" />
    </div>
  ),
);
