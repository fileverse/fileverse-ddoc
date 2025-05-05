/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
export enum IEditorTool {
  NONE,
  HEADING,
  TEXT_COLOR,
  HIGHLIGHT,
  LINK,
  FONT_FAMILY,
  ALIGNMENT,
  LIST,
  TEXT_FORMATING,
  TEXT_COLOR_PICKER,
  LINK_POPUP,
  SCRIPTS,
  FONT_SIZE,
}
export default function useComponentVisibility(initialIsVisible: boolean) {
  const [isComponentVisible, setIsComponentVisible] =
    useState<boolean>(initialIsVisible);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: any) => {
    if (ref && ref.current && !ref.current.contains(event.target)) {
      setIsComponentVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  return { ref, isComponentVisible, setIsComponentVisible };
}
export function useEditorToolVisiibility(initialIsVisible: IEditorTool) {
  const [toolVisibility, setToolVisibility] =
    useState<IEditorTool>(initialIsVisible);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: any) => {
    if (ref && ref.current && !ref.current.contains(event.target)) {
      setToolVisibility(IEditorTool.NONE);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  return { ref, toolVisibility, setToolVisibility };
}
