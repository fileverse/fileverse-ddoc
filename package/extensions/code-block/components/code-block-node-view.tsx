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
} from '@fileverse/ui';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';

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
  // Read attributes with sensible defaults
  const language = node.attrs.language || 'plaintext';
  const isPreviewMode = !editor.isEditable;
  const lineNumbers = node.attrs.lineNumbers && !isPreviewMode;
  const wordWrap = node.attrs.wordWrap && !isPreviewMode;
  const tabSize = node.attrs.tabSize ?? 2;

  const code = node.attrs.code || node.textContent || '';

  return (
    <NodeViewWrapper className="w-full">
      <pre className="code-block-bg rounded-lg border color-border-default w-full space-y-2">
        <div
          className={cn(
            'flex flex-row gap-2 items-center',
            isPreviewMode && 'hidden',
          )}
        >
          {/* Language select */}
          <Tooltip text="Select language">
            <Select
              value={language}
              onValueChange={(value: string) =>
                updateAttributes({ language: value })
              }
            >
              <SelectTrigger className="w-fit text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="min-w-fit max-h-60 overflow-y-auto">
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
          {/* Toolbar */}
          <div className="flex flex-row gap-4 items-center">
            <Tooltip text="Copy code">
              <LucideIcon
                name="Copy"
                size="sm"
                onClick={() => navigator.clipboard.writeText(code)}
              />
            </Tooltip>
            <Tooltip text="Line numbers">
              <LucideIcon
                name="List"
                size="sm"
                onClick={() => updateAttributes({ lineNumbers: !lineNumbers })}
              />
            </Tooltip>
            <Tooltip text="Word wrap">
              <LucideIcon
                name="WrapText"
                size="sm"
                onClick={() => updateAttributes({ wordWrap: !wordWrap })}
              />
            </Tooltip>
            <Tooltip text="Tab size">
              <Select
                value={String(tabSize)}
                onValueChange={(value: string) =>
                  updateAttributes({ tabSize: Number(value) })
                }
              >
                <SelectTrigger className="w-[80px] text-helper-text-sm h-7 px-2 py-1 color-bg-secondary border-none">
                  <span>Tab: {tabSize}</span>
                </SelectTrigger>
                <SelectContent className="min-w-[60px] max-h-60 overflow-y-auto ">
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
            <Tooltip text="Delete code block">
              <LucideIcon
                name="Trash2"
                size="sm"
                onClick={() => deleteNode()}
              />
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-row overflow-x-auto w-full p-0 font-mono font-medium select-text pointer-events-auto">
          {/* Line numbers */}
          {node.textContent.length > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'select-none font-mono pr-2 opacity-50 text-helper-text-sm color-text-secondary bg-transparent min-w-fit',
                !lineNumbers && 'hidden',
              )}
            >
              {node.textContent.split('\n').map((_: string, i: number) => (
                <div key={i} className="leading-5 h-5">
                  {i + 1}
                </div>
              ))}
            </span>
          )}
          <NodeViewContent
            as="code"
            className={cn(
              'leading-5',
              wordWrap ? 'min-w-fit' : 'min-w-[600px] overflow-x-auto',
            )}
          />
        </div>
      </pre>
    </NodeViewWrapper>
  );
}
