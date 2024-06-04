import clx from 'classnames'
import React from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'ghost'
export type ButtonSize = 'medium' | 'small' | 'icon' | 'iconSmall'

export type ButtonProps = {
  variant?: ButtonVariant
  active?: boolean
  activeClassname?: string
  buttonSize?: ButtonSize
  disabled?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      active,
      buttonSize = 'medium',
      children,
      disabled,
      variant = 'primary',
      className,
      activeClassname,
      ...rest
    },
    ref
  ) => {
    const buttonClassName = clx(
      'flex group items-center justify-center border border-transparent gap-2 text-sm font-semibold rounded-md disabled:opacity-50 whitespace-nowrap',

      variant === 'primary' &&
        clx(
          'text-white bg-black border-black dark:text-black dark:bg-white dark:border-white',
          !disabled &&
            !active &&
            'hover:bg-neutral-800 active:bg-neutral-900 dark:hover:bg-neutral-200 dark:active:bg-neutral-300',
          active && clx('bg-neutral-900 dark:bg-neutral-300', activeClassname)
        ),

      variant === 'secondary' &&
        clx(
          'text-neutral-900 dark:text-white',
          !disabled &&
            !active &&
            'hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-800',
          active && 'bg-neutral-200 dark:bg-neutral-800'
        ),

      variant === 'tertiary' &&
        clx(
          'bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-white dark:border-neutral-900',
          !disabled &&
            !active &&
            'hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700',
          active && clx('bg-neutral-200 dark:bg-neutral-800', activeClassname)
        ),

      variant === 'ghost' &&
        clx(
          'bg-transparent border-transparent text-neutral-500',
          !disabled &&
            !active &&
            'hover:bg-black/5 hover:text-neutral-700 active:bg-black/10 active:text-neutral-800 ',
          active && clx('bg-black/10 text-neutral-800 ', activeClassname)
        ),

      buttonSize === 'medium' && 'py-2 px-3',
      buttonSize === 'small' && 'py-1 px-2',
      buttonSize === 'icon' && 'w-8 h-8',
      buttonSize === 'iconSmall' && 'w-6 h-6',

      className
    )

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={buttonClassName}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
