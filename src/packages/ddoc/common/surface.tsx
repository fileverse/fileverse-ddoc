import clx from 'classnames'
import { HTMLProps, forwardRef } from 'react'

export type SurfaceProps = HTMLProps<HTMLDivElement> & {
  withShadow?: boolean
  withBorder?: boolean
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    { children, className, withShadow = true, withBorder = false, ...props },
    ref
  ) => {
    const surfaceClass = clx(
      className,
      'bg-white rounded',
      withShadow ? 'shadow-lg' : '',
      withBorder ? 'border border-neutral-200' : ''
    )

    return (
      <div className={surfaceClass} {...props} ref={ref}>
        {children}
      </div>
    )
  }
)

Surface.displayName = 'Surface'
