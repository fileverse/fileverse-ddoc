import React from 'react';
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@fileverse/ui';
import cn from 'classnames';
import { X } from 'lucide-react';

interface UtilsModalProps {
  title: string;
  content: React.ReactNode;
  contentClassName?: string;
}

const UtilsModal = ({ title, content, contentClassName }: UtilsModalProps) => {
  return (
    <DrawerContent className="w-full z-20">
      <DrawerHeader className="p-4">
        <DrawerTitle className="flex justify-between items-center text-left sm:text-center text-base">
          {title}
          <DrawerClose>
            <X />
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
