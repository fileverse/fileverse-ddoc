import React from 'react';
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  LucideIcon,
  Drawer,
} from '@fileverse/ui';
import cn from 'classnames';

interface UtilsModalProps {
  title: string;
  content: React.ReactNode;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  contentClassName?: string;
  onCloseAutoFocus?: () => void;
}

const UtilsModal = ({
  title,
  content,
  isOpen,
  setIsOpen,
  contentClassName,
  onCloseAutoFocus,
}: UtilsModalProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent
        className="w-full z-20"
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
    </Drawer>
  );
};

export default UtilsModal;
