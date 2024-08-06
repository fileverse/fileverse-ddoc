import React from 'react'
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../common/drawer'
import cn from 'classnames'

interface UtilsModalProps {
  title: string
  content: React.ReactNode
  contentClassName?: string
}

const UtilsModal = ({
  title,
  content,
  contentClassName,
}: UtilsModalProps) => {
  return (
    <DrawerContent className="w-full z-20">
      <DrawerHeader className="px-4 pt-0">
        <DrawerTitle className="text-left sm:text-center text-base">
          {title}
        </DrawerTitle>
      </DrawerHeader>
      <div
        className={cn(
          'flex flex-col gap-4 w-full h-full pb-4 text-base text-black',
          contentClassName
        )}
      >
        {content && content}
      </div>
    </DrawerContent>
  )
}

export default UtilsModal