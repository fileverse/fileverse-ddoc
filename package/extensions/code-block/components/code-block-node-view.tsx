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
} from '@fileverse/ui';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { useEffect, useRef } from 'react';

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
    label: 'Other',
    options: [{ label: 'Plain Text', value: 'plaintext' }],
  },
];
const TAB_SIZES = [2, 4, 8];

export default function CodeBlockNodeView({
  node,
  updateAttributes,
  editor,
  deleteNode,
}: NodeViewProps) {
  const codeRef = useRef<HTMLElement>(null);
  // Read attributes with sensible defaults
  const language = node.attrs.language || 'plaintext';
  const isPreviewMode = !editor.isEditable;
  const lineNumbers = node.attrs.lineNumbers && !isPreviewMode;
  const wordWrap = node.attrs.wordWrap && !isPreviewMode;
  const tabSize = node.attrs.tabSize ?? 2;
  const shouldFocus = node.attrs.shouldFocus;

  const code = node.attrs.code || node.textContent || '';

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
    toast({
      customIcon: 'Copy',
      description: 'Code copied to clipboard',
      variant: 'mini',
    });
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
          <div className="flex flex-row gap-2 items-center">
            {/* Language select */}
            <Tooltip text="Select language">
              <Select
                value={language}
                onValueChange={(value: string) =>
                  updateAttributes({ language: value })
                }
              >
                <SelectTrigger className="!min-w-24 text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                  <SelectValue placeholder="Select language" />
                  <span className="w-1"></span>
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
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            {/* Toolbar */}
            <Tooltip text="Copy code">
              <LucideIcon name="Copy" size="sm" onClick={handleCopyCode} />
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Tooltip text="Line numbers">
              <LucideIcon
                name="List"
                size="sm"
                onClick={() => updateAttributes({ lineNumbers: !lineNumbers })}
              />
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Tooltip text="Word wrap">
              <LucideIcon
                name="WrapText"
                size="sm"
                onClick={() => updateAttributes({ wordWrap: !wordWrap })}
              />
            </Tooltip>
            <div className="w-[1px] h-4 vertical-divider mx-1"></div>

            <Tooltip text="Tab size">
              <Select
                value={String(tabSize)}
                onValueChange={(value: string) =>
                  updateAttributes({ tabSize: Number(value) })
                }
              >
                <SelectTrigger className="w-[70px] text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                  <span>Tab: {tabSize}</span>
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
            </Tooltip>
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
            <LucideIcon name="Copy" size="sm" onClick={handleCopyCode} />
          </Tooltip>
        </div>
        <div
          className={cn(
            'bg-transparent w-full p-0 font-mono select-text pointer-events-auto overflow-y-auto no-scrollbar',
            !isPreviewMode && 'pt-8',
            node.textContent.split('\n').length > 20 && 'max-h-[500px]',
          )}
        >
          <div
            className={cn(
              'flex flex-row gap-3',
              wordWrap ? 'min-w-fit' : 'min-w-[600px]',
            )}
          >
            {lineNumbers && (
              <div className="flex-none text-right">
                {node.textContent.split('\n').map((_, i) => (
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
              as="code"
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
