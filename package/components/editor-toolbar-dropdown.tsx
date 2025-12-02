import {
  DynamicDropdown,
  IconButton,
  LucideIconProps,
  Skeleton,
  Tooltip,
} from '@fileverse/ui';
import { IEditorToolElement } from './editor-utils';
import { fadeInTransition } from './motion-div';

const EditorToolbarDropdown = ({
  tool,
  isLoading,
  renderContent,
}: {
  tool: IEditorToolElement;
  isLoading: boolean;
  renderContent: (tool: {
    title: string;
    icon: LucideIconProps['name'];
  }) => JSX.Element | null;
}) => {
  return !isLoading ? (
    <DynamicDropdown
      key={tool.title}
      sideOffset={8}
      anchorTrigger={
        <Tooltip text={tool.title}>
          <IconButton icon={tool.icon} variant="ghost" size="md" />
        </Tooltip>
      }
      content={renderContent(tool)}
    />
  ) : (
    fadeInTransition(
      <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
      tool.title + 'skeleton',
    )
  );
};

export default EditorToolbarDropdown;
