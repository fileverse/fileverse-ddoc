// demo/src/components/second-level-nav/menu-renderer.tsx
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  LucideIcon,
} from '@fileverse/ui';
import type {
  ProjectedAction,
  ProjectedCheckbox,
  ProjectedMenuBar,
  ProjectedNode,
  ProjectedRadio,
} from './menu-types';
import type { ActionRegistry } from './action-registry';

type Props = {
  projected: ProjectedMenuBar;
  registry: ActionRegistry;
  /** Fired when a requiresAuth item is clicked while signed out. */
  onRequiresAuth?: () => void;
};

export const MenuBarRenderer = ({
  projected,
  registry,
  onRequiresAuth,
}: Props) => {
  const dispatch = (
    node: ProjectedAction | ProjectedCheckbox | ProjectedRadio,
  ) => {
    if (node.kind === 'action' && node.requiresAuth && onRequiresAuth) {
      return onRequiresAuth();
    }
    registry[node.action]?.run(node.kind === 'radio' ? node.value : undefined);
  };

  const itemIcon = (icon?: string) =>
    icon && <LucideIcon name={icon} size="sm" className="mr-3" />;

  const renderNode = (node: ProjectedNode): JSX.Element => {
    switch (node.kind) {
      case 'separator':
        return <MenubarSeparator key={node.id} />;
      case 'submenu':
        return (
          <MenubarSub key={node.id}>
            <MenubarSubTrigger disabled={node.disabled}>
              {itemIcon(node.icon)}
              {node.label}
            </MenubarSubTrigger>
            <MenubarSubContent
              className="min-w-60"
              onFocusOutside={(e) => e.preventDefault()}
            >
              {renderChildren(node.children)}
            </MenubarSubContent>
          </MenubarSub>
        );
      case 'group':
        // Labeled inline section: header + children in the same panel.
        return (
          <div key={node.id} className="[&:has([data-type=label])+*]:mt-1">
            {node.label && (
              <MenubarLabel data-type="label">{node.label}</MenubarLabel>
            )}
            {renderChildren(node.children)}
          </div>
        );
      case 'checkbox':
        return (
          <MenubarCheckboxItem
            key={node.id}
            checked={node.checked}
            disabled={node.disabled}
            onSelect={(e) => {
              e.preventDefault();
              dispatch(node);
            }}
          >
            <div className="flex items-center">
              {itemIcon(node.icon)}
              {node.label}
            </div>
          </MenubarCheckboxItem>
        );
      // radio items are grouped by renderChildren below
      case 'radio':
      case 'action':
        return (
          <MenubarItem
            key={node.id}
            disabled={node.disabled}
            onSelect={() => dispatch(node)}
          >
            {itemIcon(node.icon)}
            {node.label}
            {node.kind === 'action' && node.comingSoon && (
              <span className="ml-auto rounded px-1.5 text-helper-text-sm color-text-disabled border color-border-default">
                Soon
              </span>
            )}
          </MenubarItem>
        );
    }
  };

  /** Wrap consecutive radio siblings in a MenubarRadioGroup. */
  const renderChildren = (nodes: ProjectedNode[]): JSX.Element[] => {
    const out: JSX.Element[] = [];
    let radioRun: ProjectedRadio[] = [];
    const flushRadios = () => {
      if (!radioRun.length) return;
      const group = radioRun;
      radioRun = [];
      const selected = group.find((r) => r.checked)?.value;
      out.push(
        <MenubarRadioGroup key={`${group[0].id}-group`} value={selected}>
          {group.map((r) => (
            <MenubarRadioItem
              key={r.id}
              value={r.value}
              disabled={r.disabled}
              onSelect={(e) => {
                e.preventDefault();
                dispatch(r);
              }}
            >
              <div className="flex items-center">
                {itemIcon(r.icon)}
                {r.label}
              </div>
            </MenubarRadioItem>
          ))}
        </MenubarRadioGroup>,
      );
    };
    for (const n of nodes) {
      if (n.kind === 'radio') radioRun.push(n);
      else {
        flushRadios();
        out.push(renderNode(n));
      }
    }
    flushRadios();
    return out;
  };

  return (
    // hidden lg:flex — desktop-only constraint (demo addition; backport to consumer plan)
    <Menubar aria-label="Document menu" className="hidden lg:flex">
      {projected.map((menu) => (
        <MenubarMenu key={menu.id}>
          <MenubarTrigger
            data-testid={`slnav-${menu.id}`}
            className="text-body-sm-bold color-text-default"
          >
            {menu.label}
          </MenubarTrigger>
          {/* Checkbox/radio dispatches keep the menu open (onSelect
              preventDefault), but editor commands chain .focus() which steals
              DOM focus — swallow that so only pointer/Escape dismiss. */}
          <MenubarContent
            className="min-w-60"
            onFocusOutside={(e) => e.preventDefault()}
          >
            {renderChildren(menu.children)}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
};
