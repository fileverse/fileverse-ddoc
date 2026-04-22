import { cn } from '@fileverse/ui';
import { forwardRef } from 'react';
import type { FloatingCardShellProps } from './types';
import { FLOATING_CARD_WIDTH } from '../constants';

const isInteractiveFloatingCardTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'button, [role="button"], a, [data-inline-comment-actions-menu], [data-radix-popper-content-wrapper]',
    ),
  );
};

export const FloatingCardShell = forwardRef<
  HTMLDivElement,
  FloatingCardShellProps
>(({ floatingCardId, isHidden, isFocused, onFocus, children }, ref) => {
  return (
    <div
      ref={ref}
      data-floating-comment-card={floatingCardId}
      className={cn(
        'absolute left-0 top-0 pb-[12px] border rounded-[12px] will-change-transform transition-[box-shadow,border-color] duration-150 ease-out',
        isFocused
          ? 'shadow-elevation-3 color-bg-default  color-border-default'
          : 'hover:color-bg-default-hover border-transparent hover:color-border-default   bg-[#00000005] ',
      )}
      style={{
        width: FLOATING_CARD_WIDTH,
        contain: 'layout style paint',
        visibility: isHidden ? 'hidden' : 'visible',
        opacity: isHidden ? 0 : 1,
      }}
      onMouseDown={(event) => {
        if (isInteractiveFloatingCardTarget(event.target)) {
          return;
        }

        onFocus();
      }}
    >
      {children}
    </div>
  );
});

FloatingCardShell.displayName = 'FloatingCardShell';
