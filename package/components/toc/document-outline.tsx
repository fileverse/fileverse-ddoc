/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import cn from 'classnames';
import { useMediaQuery } from 'usehooks-ts';
import { BottomDrawer, IconButton, Tooltip } from '@fileverse/ui';
import { ToC } from './toc';
import { DocumentOutlineProps } from './types';

const MemorizedToC = React.memo(ToC);

export const DocumentOutline = ({
  editor,
  hasToC,
  items,
  setItems,
  showTOC,
  setShowTOC,
  isPreviewMode,
}: DocumentOutlineProps) => {
  const isMediaMax1280px = useMediaQuery('(max-width:1280px)');

  const shouldHideToC = items.length < 2;

  const DesktopTOC = () => {
    return (
      <div
        className={cn(
          'flex flex-col gap-4 items-start justify-start absolute left-4',
          (!hasToC || shouldHideToC) && 'hidden',
          isPreviewMode ? 'top-[4rem]' : 'top-[7.3rem]',
        )}
      >
        <Tooltip
          text={showTOC ? 'Hide document outline' : 'Show document outline'}
          position="right"
        >
          <IconButton
            icon={showTOC ? 'ChevronLeft' : 'List'}
            variant="ghost"
            size="lg"
            onClick={() => setShowTOC?.((prev) => !prev)}
            className="color-text-default min-w-9 h-9"
            data-testid="desktop-toc-btn"
          />
        </Tooltip>
        <div
          className={cn(
            'table-of-contents animate-in fade-in slide-in-from-left-5',
            showTOC ? 'block' : 'hidden',
          )}
        >
          <MemorizedToC editor={editor} items={items} setItems={setItems} />
        </div>
      </div>
    );
  };

  const MobileTOC = () => {
    return (
      <BottomDrawer
        key="mobile-toc"
        open={showTOC!}
        onOpenChange={setShowTOC!}
        className="w-full shadow-elevation-4"
        contentClassName="w-full h-full !border-none !shadow-elevation-4 !gap-2"
        footerClassName="hidden"
        noOverlay
        hasCloseIcon
        content={
          <React.Fragment>
            <div className="flex justify-between items-center p-4">
              <h2 className="text-heading-sm-bold">Document outline</h2>
            </div>
            <div className={cn('table-of-contents px-4')}>
              <MemorizedToC editor={editor} items={items} setItems={setItems} />
            </div>
          </React.Fragment>
        }
      />
    );
  };

  return !isMediaMax1280px ? DesktopTOC() : MobileTOC();
};
