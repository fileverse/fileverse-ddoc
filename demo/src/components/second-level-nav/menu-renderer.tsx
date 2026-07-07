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
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  LucideIcon,
} from '@fileverse/ui';
import type { ProjectedMenuBar, ProjectedNode } from './menu-types';
import type { ActionRegistry } from './action-registry';

type Props = {
  projected: ProjectedMenuBar;
  registry: ActionRegistry;
  /** Fired when a requiresAuth item is clicked while signed out. */
  onRequiresAuth?: () => void;
};

export const MenuBarRenderer = ({ projected, registry, onRequiresAuth }: Props) => {
  const dispatch = (node: ProjectedNode) => {
    if (node.requiresAuth && onRequiresAuth) return onRequiresAuth();
    if (node.action) registry[node.action]?.run(node.value);
  };

  const renderNode = (node: ProjectedNode): JSX.Element => {
    switch (node.kind) {
      case 'separator':
        return <MenubarSeparator key={node.id} />;
      case 'submenu':
        return (
          <MenubarSub key={node.id}>
            <MenubarSubTrigger disabled={node.disabled}>
              {node.icon && <LucideIcon name={node.icon} size="sm" className="mr-2" />}
              {node.label}
            </MenubarSubTrigger>
            <MenubarSubContent>{renderChildren(node.children ?? [])}</MenubarSubContent>
          </MenubarSub>
        );
      case 'checkbox':
        return (
          <MenubarCheckboxItem
            key={node.id}
            checked={node.checked ?? false}
            disabled={node.disabled}
            onSelect={(e) => {
              e.preventDefault();
              dispatch(node);
            }}
          >
            {node.label}
            {node.shortcut && <MenubarShortcut>{node.shortcut}</MenubarShortcut>}
          </MenubarCheckboxItem>
        );
      // radio items are grouped by renderChildren below
      case 'radio':
      case 'action':
      default:
        return (
          <MenubarItem
            key={node.id}
            disabled={node.disabled}
            onSelect={() => dispatch(node)}
          >
            {node.icon && <LucideIcon name={node.icon} size="sm" className="mr-2" />}
            {node.label}
            {node.comingSoon && (
              <span className="ml-auto rounded px-1.5 text-helper-text-sm color-text-disabled border color-border-default">
                Soon
              </span>
            )}
            {node.shortcut && !node.comingSoon && (
              <MenubarShortcut>{node.shortcut}</MenubarShortcut>
            )}
          </MenubarItem>
        );
    }
  };

  /** Wrap consecutive radio siblings in a MenubarRadioGroup. */
  const renderChildren = (nodes: ProjectedNode[]): JSX.Element[] => {
    const out: JSX.Element[] = [];
    let radioRun: ProjectedNode[] = [];
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
              value={r.value!}
              disabled={r.disabled}
              onSelect={(e) => {
                e.preventDefault();
                dispatch(r);
              }}
            >
              {r.label}
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
          <MenubarTrigger data-testid={`slnav-${menu.id}`}>{menu.label}</MenubarTrigger>
          <MenubarContent>{renderChildren(menu.children)}</MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
};
