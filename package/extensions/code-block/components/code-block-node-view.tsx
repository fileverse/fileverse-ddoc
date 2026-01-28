import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  cn,
  LucideIcon,
  Tooltip,
  toast,
  Button,
} from '@fileverse/ui';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useResponsive } from '../../../utils/responsive';

const LANGUAGE_GROUPS = [
  {
    label: 'Web',
    options: [
      { label: 'HTML', value: 'html' },
      { label: 'CSS', value: 'css' },
      { label: 'JavaScript', value: 'js' },
      { label: 'TypeScript', value: 'ts' },
      { label: 'JSON', value: 'json' },
      { label: 'Markdown', value: 'md' },
    ],
  },
  {
    label: 'Scripting',
    options: [
      { label: 'Python', value: 'python' },
      { label: 'Bash', value: 'bash' },
    ],
  },
  {
    label: 'Blockchain',
    options: [{ label: 'Solidity', value: 'solidity' }],
  },
  {
    label: 'Other',
    options: [
      { label: 'Plain Text', value: 'plaintext' },
      { label: 'LaTeX', value: 'tex' },
    ],
  },
];
const TAB_SIZES = [2, 4, 8];

export default function CodeBlockNodeView({
  node,
  updateAttributes,
  editor,
  deleteNode,
}: NodeViewProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const [copyIcon, setCopyIcon] = useState<'Copy' | 'Check'>('Copy');
  // Read attributes with sensible defaults
  const language = node.attrs.language || 'plaintext';
  const isPreviewMode = !editor.isEditable;
  const lineNumbers = node.attrs.lineNumbers && !isPreviewMode;
  const wordWrap = node.attrs.wordWrap && !isPreviewMode;
  const tabSize = node.attrs.tabSize ?? 2;
  const shouldFocus = node.attrs.shouldFocus;
  const { isMobile } = useResponsive();

  const code = node.attrs.code || node.textContent || '';

  const codeLines = useMemo(() => {
    const lines = code.split('\n');
    const processedLines: string[] = [];

    let maxLineLength = 0;

    if (wordWrap) {
      // For mobile: 330px width - 16px padding (4px on each side) - 24px for line numbers if enabled
      // Assuming average monospace character width of ~8px
      maxLineLength = isMobile
        ? Math.floor((330 - 16 - (lineNumbers ? 24 : 0)) / 8)
        : 79;
    } else {
      maxLineLength = isMobile ? 85 : 85;
    }

    for (const line of lines) {
      if (line.length > maxLineLength) {
        // Split the line into multiple lines of max 80 characters
        const wrappedLines =
          line.match(new RegExp(`.{1,${maxLineLength}}`, 'g')) || [];
        processedLines.push(...wrappedLines);
      } else {
        processedLines.push(line);
      }
    }
    return processedLines;
  }, [code, isMobile, wordWrap, lineNumbers]);

  useEffect(() => {
    if (shouldFocus && codeRef.current) {
      codeRef.current.focus();
      // Reset shouldFocus after focusing
      updateAttributes({ shouldFocus: false });
    }
  }, [shouldFocus, updateAttributes]);

  // Add focus handler to maintain focus state
  const handleFocus = () => {
    updateAttributes({ shouldFocus: true });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopyIcon('Check');
    toast({
      customIcon: 'Copy',
      iconType: 'icon',
      title: 'Code copied to clipboard',
      variant: 'success',
      toastType: 'mini',
    });

    const timeout = setTimeout(() => {
      setCopyIcon('Copy');
    }, 3000);

    return () => clearTimeout(timeout);
  };

  return (
    <NodeViewWrapper className="w-full">
      <pre
        className={cn('rounded-lg border color-border-default w-full relative')}
      >
        <div
          className={cn(
            'flex flex-row gap-2 items-center justify-between color-bg-secondary absolute top-0 left-0 z-10 rounded-t-lg w-full border-b color-border-default px-2 py-1',
            isPreviewMode && 'hidden',
          )}
        >
          <div className="flex flex-row gap-0 items-center">
            {/* Language select */}
            <Select
              value={language}
              onValueChange={(value: string) =>
                updateAttributes({ language: value })
              }
            >
              <SelectTrigger className="!min-w-24 text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                <Tooltip text="Select language">
                  <SelectValue placeholder="Select language" />
                  <span className="w-1"></span>
                </Tooltip>
              </SelectTrigger>
              <SelectContent
                className="min-w-fit max-h-none"
                showScrollButtons={false}
              >
                {LANGUAGE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-helper-text-sm"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            {/* Toolbar */}
            <Tooltip text="Copy code">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="min-w-fit p-2 relative"
              >
                <div className="relative w-4 h-4">
                  <LucideIcon
                    name={copyIcon}
                    size="sm"
                    className={cn(
                      'transition-all duration-300 absolute inset-0',
                      copyIcon === 'Check'
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-0',
                    )}
                  />
                  <LucideIcon
                    name="Copy"
                    size="sm"
                    className={cn(
                      'transition-all duration-300 absolute inset-0',
                      copyIcon === 'Check'
                        ? 'opacity-0 scale-0'
                        : 'opacity-100 scale-100',
                    )}
                  />
                </div>
              </Button>
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Tooltip text="Line numbers">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateAttributes({ lineNumbers: !lineNumbers })}
                className={cn(
                  'min-w-fit p-2',
                  lineNumbers &&
                    'color-bg-brand color-text-on-brand hover:bg-[hsla(var(--color-bg-brand-hover))]',
                )}
              >
                <LucideIcon name="List" size="sm" />
              </Button>
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Tooltip text="Word wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateAttributes({ wordWrap: !wordWrap })}
                className={cn(
                  'min-w-fit p-2',
                  wordWrap &&
                    'color-bg-brand color-text-on-brand hover:bg-[hsla(var(--color-bg-brand-hover))]',
                )}
              >
                <LucideIcon name="WrapText" size="sm" />
              </Button>
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Select
              value={String(tabSize)}
              onValueChange={(value: string) =>
                updateAttributes({ tabSize: Number(value) })
              }
            >
              <SelectTrigger className="w-full text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                <Tooltip text="Tab size">
                  <span className="!hidden sm:!block">Tab: {tabSize}</span>
                  <span className="!block sm:!hidden">{tabSize}</span>
                </Tooltip>
              </SelectTrigger>
              <SelectContent
                className="min-w-[60px] max-h-60 overflow-y-auto "
                showScrollButtons={false}
              >
                {TAB_SIZES.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-helper-text-sm"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tooltip text="Delete code block">
            <LucideIcon
              name="Trash2"
              size="sm"
              className="mr-1"
              onClick={() => deleteNode()}
            />
          </Tooltip>
        </div>
        <div
          className={cn(
            'absolute top-3 right-3 hidden z-10 color-bg-default',
            isPreviewMode && 'flex',
          )}
        >
          <Tooltip text="Copy code">
            <div className="relative w-4 h-4" onClick={handleCopyCode}>
              <LucideIcon
                name={copyIcon}
                size="sm"
                className={cn(
                  'transition-all duration-200 absolute inset-0',
                  copyIcon === 'Check'
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-50',
                )}
              />
              <LucideIcon
                name="Copy"
                size="sm"
                className={cn(
                  'transition-all duration-200 absolute inset-0',
                  copyIcon === 'Check'
                    ? 'opacity-0 scale-50'
                    : 'opacity-100 scale-100',
                )}
              />
            </div>
          </Tooltip>
        </div>
        <div
          className={cn(
            'bg-transparent w-full p-0 font-mono select-text pointer-events-auto overflow-y-auto no-scrollbar max-w-[650px]',
            !isPreviewMode && 'pt-8',
            codeLines.length > 20 && 'max-h-[500px]',
          )}
        >
          <div
            className={cn(
              'flex flex-row gap-3',
              wordWrap
                ? isMobile
                  ? 'w-[330px]'
                  : 'w-[650px]'
                : isMobile
                  ? 'w-[720px]'
                  : 'w-[720px]',
            )}
          >
            {lineNumbers && (
              <div className="flex-none text-right">
                {codeLines.map((_, i) => (
                  <div
                    key={i}
                    className="leading-5 h-5 text-helper-text-sm font-mono color-text-secondary opacity-50"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <NodeViewContent
              ref={codeRef}
              as="div"
              className={cn(
                'leading-5 font-mono pl-4 flex-1',
                node.textContent.length === 0 && 'min-h-[20px]',
              )}
              onFocus={handleFocus}
            />
          </div>
        </div>
      </pre>
    </NodeViewWrapper>
  );
}
