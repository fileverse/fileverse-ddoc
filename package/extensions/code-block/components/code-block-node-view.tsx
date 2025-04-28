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
    <NodeViewWrapper>
      <div className="absolute top-1 right-1 z-10 min-w-fit">
        <Select
          value={language}
          onValueChange={(value: string) =>
            updateAttributes({ language: value })
          }
        >
          <SelectTrigger className="w-fit text-helper-text-sm h-7 px-2 py-1 rounded-none border-none rounded-tr-lg color-bg-secondary">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent className="min-w-[160px] max-h-60 overflow-y-auto text-helper-text-sm">
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
      </div>
      <pre className="code-block-bg rounded-lg border color-border-default p-5 font-mono font-medium select-text pointer-events-auto">
        <NodeViewContent as="code" className="" />
      </pre>
    </NodeViewWrapper>
  );
}
