import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
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

export default function CodeBlockNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const language = node.attrs.language || 'plaintext';

  return (
    <NodeViewWrapper className="relative group">
      <div className="absolute top-2 right-2 z-10 min-w-[160px]">
        <Select
          value={language}
          onValueChange={(value: string) =>
            updateAttributes({ language: value })
          }
        >
          <SelectTrigger className="w-[160px] text-body-sm h-7 px-2 py-1">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent className="min-w-[160px] max-h-60 overflow-y-auto text-body-sm">
            {LANGUAGE_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre className="code-block-bg rounded-lg border color-border-default p-5 font-mono font-medium select-text pointer-events-auto">
        <NodeViewContent as="code" className="" />
      </pre>
    </NodeViewWrapper>
  );
}
