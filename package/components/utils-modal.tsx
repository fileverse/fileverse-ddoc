import React from 'react';
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  LucideIcon,
} from '@fileverse/ui';
import cn from 'classnames';

interface UtilsModalProps {
  title: string;
  content: React.ReactNode;
  contentClassName?: string;
  ref?: React.RefObject<HTMLDivElement>;
  onCloseAutoFocus?: () => void;
}

const UtilsModal = ({
  title,
  content,
  contentClassName,
  ref,
  onCloseAutoFocus,
}: UtilsModalProps) => {
  return (
    <DrawerContent
      className="w-full z-20"
      ref={ref}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DrawerHeader className="p-4">
        <DrawerTitle className="flex justify-between items-center text-left sm:text-center text-base">
          {title}
          <DrawerClose>
            <LucideIcon name="X" size="sm" />
          </DrawerClose>
        </DrawerTitle>
      </DrawerHeader>
      <div
        className={cn(
          'flex flex-col gap-4 w-full h-full pb-4 text-base text-black',
          contentClassName,
        )}
      >
        {content && content}
      </div>
    </DrawerContent>
  );
};

export default UtilsModal;
