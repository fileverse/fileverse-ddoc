import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, LucideIcon } from '@fileverse/ui';

const alertVariants = cva(
  'relative overflow-hidden w-full h-fit rounded-md px-3 py-3 text-body-sm flex gap-4 [&>svg]:color-text-default',
  {
    variants: {
      variant: {
        default:
          'border color-border-default color-bg-default color-text-default',
        brand:
          'color-bg-brand-light color-text-default dark:text-[#363B3F] [&>svg]:color-text-default dark:[&>svg]:text-[#363B3F]',
        secondary:
          'color-bg-secondary color-text-default [&>svg]:color-text-default',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface DynamicAlertBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  iconAlignment?: 'start' | 'center' | 'end';
  title?: React.ReactNode;
  description?: React.ReactNode;
  progress?: number;
  hideCloseIcon?: boolean;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: React.ReactNode;
  contentClassName?: string;
}

export const DynamicAlertBanner = React.forwardRef<
  HTMLDivElement,
  DynamicAlertBannerProps
>(
  (
    {
      className,
      contentClassName,
      variant,
      icon,
      iconAlignment = 'start',
      title,
      description,
      progress,
      hideCloseIcon = false,
      isLoading,
      open = true,
      onOpenChange,
      footer,
      ...props
    },
    ref
  ) => {
    if (!open) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className={cn('flex gap-3 w-full', contentClassName)}>
          {/* Left Icon */}
          {icon && (
            <div
              className={cn(
                'flex-shrink-0 flex flex-col items-center',
                iconAlignment === 'start' && 'justify-start',
                iconAlignment === 'center' && 'justify-center',
                iconAlignment === 'end' && 'justify-end'
              )}
            >
              {icon}
            </div>
          )}
          {/* Content */}
          <div className="flex-1">
            {title && (
              <div className="flex items-center gap-2 mb-1">
                <h5 className="text-heading-xsm max-w-[95%]">{title}</h5>
                {isLoading && (
                  <LucideIcon
                    name="LoaderCircle"
                    size="sm"
                    className="animate-spin"
                    fill="transparent"
                    stroke="currentColor"
                  />
                )}
              </div>
            )}
            {description && (
              <div className="text-helper-text-sm color-text-secondary">
                {description}
              </div>
            )}
            {/* Progress Bar */}
            {typeof progress === 'number' && (
              <div className="mt-2 rounded-full h-2 color-bg-tertiary">
                <div
                  className="rounded-full h-full bg-current color-text-success animate-pulse transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {footer && <>{footer}</>}

        {!hideCloseIcon && (
          <button
            onClick={() => {
              onOpenChange?.(false);
            }}
            className={cn(
              'absolute top-3 right-3 color-text-default hover:color-text-default-hover',
              variant === 'brand' && 'dark:text-[#363B3F]'
            )}
          >
            <LucideIcon name="X" size="sm" />
          </button>
        )}
      </div>
    );
  }
);

DynamicAlertBanner.displayName = 'DynamicAlertBanner';
