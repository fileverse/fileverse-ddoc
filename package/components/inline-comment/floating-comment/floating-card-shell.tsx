import { cn } from '@fileverse/ui';
import { forwardRef } from 'react';
import type { FloatingCardShellProps } from './types';

export const FLOATING_CARD_WIDTH = 300;

export const FloatingCardShell = forwardRef<
  HTMLDivElement,
  FloatingCardShellProps
>(({ floatingCardId, isHidden, isFocused, onFocus, children }, ref) => {
  return (
    <div
      ref={ref}
      data-floating-comment-card={floatingCardId}
      className={cn(
        'absolute left-0 top-0 pb-[12px] rounded-[12px] border will-change-transform transition-[box-shadow,border-color] duration-150 ease-out',
        isFocused
          ? 'shadow-elevation-3 color-bg-default color-border-default'
          : 'bg-[#00000005] ',
      )}
      style={{
        width: FLOATING_CARD_WIDTH,
        contain: 'layout style paint',
        visibility: isHidden ? 'hidden' : 'visible',
        opacity: isHidden ? 0 : 1,
      }}
      onMouseDown={onFocus}
    >
      {children}
    </div>
  );
});

FloatingCardShell.displayName = 'FloatingCardShell';
