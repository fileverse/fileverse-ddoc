import React from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../common/dialog'
import cn from 'classnames'
import { Button, ButtonVariant } from '../common/button'

interface LinkModalProps {
  title: string
  content: React.ReactNode
  contentClassName?: string
  open: boolean
  onOpenChange?: () => void
  primaryAction?: {
    label: string
    variant?: ButtonVariant
    className?: string
    isLoading?: boolean
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    variant?: ButtonVariant
    className?: string
    isLoading?: boolean
    onClick?: () => void
  }
}

const LinkModal = ({
  title,
  content,
  contentClassName,
  open,
  onOpenChange,
  primaryAction,
  secondaryAction,
}: LinkModalProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md sm:w-full w-[80%] z-20">
        <DialogHeader className="px-4 pt-0 border-b-[1px]">
          <DialogTitle className="text-left text-base">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            'flex flex-col gap-4 w-full h-full pb-4 text-base text-black',
            contentClassName
          )}
        >
          {content && content}
        </div>
        <DialogFooter className="px-5 pb-5 justify-end sm:">
          {secondaryAction && (
            <DialogClose asChild>
              <Button
                disabled={secondaryAction?.isLoading}
                isLoading={secondaryAction?.isLoading}
                className={secondaryAction?.className}
                variant={secondaryAction?.variant || 'ghost'}
                onClick={secondaryAction?.onClick}
              >
                {secondaryAction?.label}
              </Button>
            </DialogClose>
          )}
          {primaryAction && (
            <Button
              disabled={primaryAction?.isLoading}
              isLoading={primaryAction?.isLoading}
              className={primaryAction?.className}
              variant={primaryAction?.variant || 'primary'}
              onClick={primaryAction?.onClick}
            >
              {primaryAction?.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LinkModal