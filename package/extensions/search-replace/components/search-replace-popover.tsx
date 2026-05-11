import {
  Button,
  IconButton,
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  TextField,
  Tooltip,
} from '@fileverse/ui';
import { useShallow } from 'zustand/shallow';
import { useSearchReplaceStore } from '../../../../package/stores/search-replace-store';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { useState, useEffect, useReducer, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
// import { useSearchReplace } from '../hooks/use-search-replace';
import type { Editor } from '@tiptap/core';
import { scrollIntoView } from '../../../utils/get-editor-scroll-container';

const SearchReplace = ({ editor }: { editor: Editor | null }) => {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', force);
    return () => {
      editor.off('transaction', force);
    };
  }, [editor]);
  const [showReplace, setShowReplace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchTerm, replaceTerm, showSearchReplacePopover } =
    useSearchReplaceStore(
      useShallow((s) => ({
        searchTerm: s.searchTerm,
        replaceTerm: s.replaceTerm,
        showSearchReplacePopover: s.showSearchReplacePopover,
      })),
    );

  const { setShowReplacePopover, setSearchTerm, setReplaceTerm } =
    useSearchReplaceStore((s) => s.actions);

  function hidePopover() {
    if (editor) {
      console.log('editor');
      editor.commands.setSearchTerm('');
    }
    setShowReplacePopover(false);
  }

  useEscapeKey(hidePopover);

  const results = editor?.storage.searchAndReplace.results;
  const resultIndex = editor?.storage.searchAndReplace.resultIndex;

  function toggleReplace() {
    setShowReplace((s) => !s);
  }

  function handleSearchTerm(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const { value } = e.target;
    setSearchTerm(value);
    editor.commands.setSearchTerm(value);
    editor.commands.resetIndex();
  }

  function handleReplaceTerm(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const { value } = e.target;
    setReplaceTerm(value);
    editor.commands.setReplaceTerm(value);
    editor.commands.resetIndex();
  }

  function handleReplace() {
    if (!editor) return;
    editor.commands.replace();
  }

  function handleReplaceAll() {
    if (!editor) return;
    editor.commands.replaceAll();
  }

  function gotoSelection() {
    if (!editor) return;
    const { results, resultIndex } = editor.storage.searchAndReplace;
    const current = results[resultIndex];
    if (!current) return;

    const { node } = editor.view.domAtPos(current.from);

    if (node instanceof HTMLElement) {
      scrollIntoView({
        el: node,
        editorRoot: editor.view.dom as HTMLElement,
        isNativeMobile: false,
      });
    }
  }

  function handleNext() {
    if (!editor) return;
    editor.commands.nextSearchResult();
    gotoSelection();
  }

  function handlePrevious() {
    if (!editor) return;
    editor.commands.previousSearchResult();
    gotoSelection();
  }

  function handleSearchInputKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code === 'Enter') {
      if (e.shiftKey) {
        handlePrevious();
        return;
      }
      handleNext();
    }
    return;
  }

  return (
    <Popover open={showSearchReplacePopover}>
      <PopoverAnchor className="absolute right-0" />
      <PopoverContent
        sideOffset={12}
        alignOffset={12}
        align="start"
        side="left"
        arrowPadding={12}
        className="pt-2 border-none bg-transparent"
      >
        <motion.div className="p-2 border color-border-default w-80 max-w-full rounded-lg space-y-2 color-bg-default">
          {/* Search */}
          <div className="flex items-center gap-2 pr-1 pl-2 border rounded-md">
            <TextField
              placeholder="Search text..."
              value={searchTerm}
              ref={inputRef}
              className="border-none p-0"
              onChange={handleSearchTerm}
              onKeyDown={handleSearchInputKeydown}
            />
            {results && results.length > 0 && (
              <span className="color-text-secondary text-sm">
                {`${typeof resultIndex === 'number' ? resultIndex + 1 : '?'}/${results.length}`}
              </span>
            )}
            <div className="flex items-center">
              <div className="flex items-center">
                <Tooltip text="Previous">
                  <IconButton
                    icon={'ArrowUp'}
                    variant={'ghost'}
                    size="sm"
                    onClick={handlePrevious}
                  />
                </Tooltip>
                <Tooltip text="Next">
                  <IconButton
                    icon={'ArrowDown'}
                    variant={'ghost'}
                    size="sm"
                    onClick={handleNext}
                  />
                </Tooltip>
              </div>
              <Tooltip text="Replace">
                <IconButton
                  icon={'Replace'}
                  variant={'ghost'}
                  size="sm"
                  onClick={toggleReplace}
                />
              </Tooltip>
            </div>
            <PopoverClose asChild onClick={hidePopover}>
              <IconButton icon={'X'} variant={'ghost'} size="sm" />
            </PopoverClose>
          </div>
          {/* Replace */}
          <AnimatePresence>
            {showReplace && (
              <motion.div
                className="space-y-2 overflow-clip"
                key={'replace'}
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                layout="size"
              >
                <div className="flex items-center gap-2 px-2 border rounded-md">
                  <TextField
                    placeholder="Replace with..."
                    value={replaceTerm}
                    onChange={handleReplaceTerm}
                    className="border-none p-0"
                  />
                </div>
                <div className="flex justify-end items-center gap-2">
                  <Button
                    variant={'default'}
                    size={'sm'}
                    className="min-w-0"
                    onClick={handleReplace}
                  >
                    Replace
                  </Button>
                  <Button
                    variant={'secondary'}
                    size={'sm'}
                    className="min-w-0"
                    onClick={handleReplaceAll}
                  >
                    Replace All
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchReplace;
