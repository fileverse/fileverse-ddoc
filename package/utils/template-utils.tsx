import { JSONContent } from '@tiptap/react';

import {
  Button,
  ButtonGroup,
  cn,
  Divider,
  DynamicDropdown,
  LucideIcon,
  LucideIconProps,
  UltimateIcons,
} from '@fileverse/ui';
import { getTemplateContent } from './getTemplateContent';

type IconType = LucideIconProps['name'] | string;

type TemplateButtonProps = {
  label: string;
  icon: IconType;
  onClick: () => void;
  content: JSONContent | null;
}[];

const renderIcon = (icon: IconType, className?: string) => {
  if (
    typeof icon === 'string' &&
    UltimateIcons[icon as keyof typeof UltimateIcons]
  ) {
    return (
      <LucideIcon
        name={icon as keyof typeof UltimateIcons}
        className={className}
      />
    );
  } else if (typeof icon === 'string') {
    return <span className={className}>{icon}</span>;
  }
  return null;
};

const createTemplateButtons = (
  addTemplate: (template: JSONContent) => void,
): TemplateButtonProps => [
  {
    label: 'To-do',
    icon: 'ListChecks',
    onClick: () => {
      const content = getTemplateContent('todo-list');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('todo-list'),
  },
  {
    label: 'Breathe!',
    icon: '🧘‍♂️',
    onClick: () => {
      const content = getTemplateContent('breathe');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('breathe'),
  },
];

const createMoreTemplates = (
  addTemplate: (template: JSONContent) => void,
): TemplateButtonProps => [
  {
    label: 'Meeting notes',
    icon: 'NotepadText',
    onClick: () => {
      const content = getTemplateContent('meeting-notes');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('meeting-notes'),
  },
  {
    label: 'Intern notes',
    icon: '📝',
    onClick: () => {
      const content = getTemplateContent('intern-notes');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('intern-notes'),
  },
  {
    label: 'Brainstorm',
    icon: 'Lightbulb',
    onClick: () => {
      const content = getTemplateContent('brainstorm');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('brainstorm'),
  },
  {
    label: 'Pretend to work',
    icon: '🏄🏻‍♂️',
    onClick: () => {
      const content = getTemplateContent('pretend-to-work');
      if (content) addTemplate(content);
    },
    content: getTemplateContent('pretend-to-work'),
  },
];

const renderTemplateButtons = (
  templateButtons: TemplateButtonProps,
  moreTemplates: TemplateButtonProps,
  visibleTemplateCount: number,
  toggleAllTemplates: () => void,
  isExpanded: boolean,
  zoomLevel: string,
) => (
    <ButtonGroup className={cn(
      "template-buttons space-x-0 gap-2 absolute top-8 left-0 md:!left-[unset] md:-translate-y-1 md:!right-0 md:!top-0 z-40",
      {
        "md:translate-x-0": zoomLevel === "0.5",
        "md:-translate-x-[45%]": zoomLevel === "0.75",
        "md:-translate-x-[60%]": zoomLevel === "1",
        "md:-translate-x-[120%]": zoomLevel === "1.4",
        "md:-translate-x-[140%]": zoomLevel === "1.5",
        "md:-translate-x-[320%]": zoomLevel === "2",
      }
    )}>
      {templateButtons.map((button, index) => (
        <Button
          key={index}
          onClick={button.onClick}
          variant={'ghost'}
          className="gap-2 color-bg-default-hover text-body-sm color-text-default rounded-lg hover:brightness-95 transition-all min-w-fit"
        >
          {renderIcon(button.icon)}
          <span>{button.label}</span>
        </Button>
      ))}
      <DynamicDropdown
        key={'More Templates'}
        align="end"
        sideOffset={10}
        anchorTrigger={
          <Button
            variant={'ghost'}
            className="gap-2 color-bg-default-hover text-body-sm color-text-default rounded-lg hover:brightness-95 transition-all w-full min-w-0 !p-[10px]"
          >
            <LucideIcon name={'Ellipsis'} className="color-text-default" />
          </Button>
        }
        content={
          <div className="flex flex-col gap-1 p-2 w-[12rem]">
            <div className="max-h-44 overflow-auto gap-1 flex flex-col">
              {moreTemplates
                .slice(0, visibleTemplateCount)
                .map((button, index) => (
                  <Button
                    key={index}
                    onClick={button.onClick}
                    variant={'ghost'}
                    className="justify-start gap-2 text-body-sm color-text-default min-w-fit px-2 rounded-lg"
                  >
                    {renderIcon(button.icon)}
                    <span>{button.label}</span>
                  </Button>
                ))}
            </div>
            <Divider className="w-full !border-t-[1px]" />
            <Button
              variant={'ghost'}
              className="justify-between gap-2 text-body-sm color-text-default min-w-fit px-2 rounded-lg"
              onClick={toggleAllTemplates}
            >
              <span>{isExpanded ? 'Less' : 'More'}</span>
              <LucideIcon
                name="ChevronDown"
                size="sm"
                className={cn(isExpanded ? 'rotate-180' : '')}
              />
            </Button>
          </div>
        }
      />
    </ButtonGroup>
  );

export {
  renderIcon,
  createTemplateButtons,
  createMoreTemplates,
  renderTemplateButtons,
};
