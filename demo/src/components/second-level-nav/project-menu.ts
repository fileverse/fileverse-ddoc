import type {
  MenuBarTree,
  MenuContext,
  MenuNode,
  ProjectedMenuBar,
  ProjectedNode,
} from './menu-types';

const projectNode = (node: MenuNode, ctx: MenuContext): ProjectedNode | null => {
  if (node.visibleWhen && !node.visibleWhen(ctx)) return null;

  const children = node.children
    ?.map((c) => projectNode(c, ctx))
    .filter((c): c is ProjectedNode => c !== null);
  const cleaned = children ? stripSeparators(children) : undefined;

  // A submenu whose children all projected away disappears too.
  if (node.kind === 'submenu' && (!cleaned || cleaned.length === 0)) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { visibleWhen, enabledWhen, state, label, children: _c, ...rest } = node;
  return {
    ...rest,
    label: typeof label === 'function' ? label(ctx) : label,
    disabled: node.comingSoon === true || (enabledWhen ? !enabledWhen(ctx) : false),
    checked: state ? state(ctx) : undefined,
    children: cleaned,
  };
};

/** Remove leading/trailing separators and collapse consecutive ones. */
const stripSeparators = (nodes: ProjectedNode[]): ProjectedNode[] => {
  const out: ProjectedNode[] = [];
  for (const n of nodes) {
    if (
      n.kind === 'separator' &&
      (out.length === 0 || out[out.length - 1].kind === 'separator')
    )
      continue;
    out.push(n);
  }
  while (out.length && out[out.length - 1].kind === 'separator') out.pop();
  return out;
};

export const projectMenu = (
  tree: MenuBarTree,
  ctx: MenuContext,
): ProjectedMenuBar =>
  tree
    .map((menu) => ({
      ...menu,
      children: stripSeparators(
        menu.children
          .map((n) => projectNode(n, ctx))
          .filter((n): n is ProjectedNode => n !== null),
      ),
    }))
    .filter((menu) => menu.children.length > 0);
