import type { MenuBarTree, MenuContext, MenuNode } from './menu-types';

export type ActionHandler = {
  run: (arg?: string) => void;
  isActive?: boolean;
  isEnabled?: boolean;
  current?: string | null;
};
export type ActionRegistry = Record<string, ActionHandler>;

export const mergeRegistries = (...sources: ActionRegistry[]): ActionRegistry =>
  Object.assign({}, ...sources);

const collectActionIds = (nodes: MenuNode[], acc: string[] = []): string[] => {
  for (const n of nodes) {
    if (n.action && !n.comingSoon) acc.push(n.action);
    if (n.children) collectActionIds(n.children, acc);
  }
  return acc;
};

/** Dev-time firewall (architecture §4): a tree naming an unregistered action
 *  must fail tests/build, never ship a dead menu item. */
export const assertTreeResolves = (
  tree: MenuBarTree,
  registry: ActionRegistry,
): void => {
  const missing = tree
    .flatMap((m) => collectActionIds(m.children))
    .filter((id) => !(id in registry));
  if (missing.length > 0) {
    throw new Error(
      `SecondLevelNav: unresolved actionIds: ${[...new Set(missing)].join(', ')}`,
    );
  }
};

export const registryToMenuState = (reg: ActionRegistry): MenuContext['state'] =>
  Object.fromEntries(
    Object.entries(reg).map(([id, h]) => [
      id,
      { isActive: h.isActive, isEnabled: h.isEnabled, current: h.current },
    ]),
  );
