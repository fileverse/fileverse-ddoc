// menu-types.ts — ENGINE types: no Tiptap, no app imports (dsheets D-C).
import type { DocumentCapabilities } from './capabilities';

export type MenuContext = {
  caps: DocumentCapabilities;
  /** Reactive value bag: actionId → { isActive?, isEnabled?, current? }.
   *  Populated at wiring time from the merged registry. */
  state: Record<
    string,
    { isActive?: boolean; isEnabled?: boolean; current?: string | null }
  >;
};

export type MenuNode = {
  id: string;
  label: string | ((ctx: MenuContext) => string);
  icon?: string;
  shortcut?: string;
  comingSoon?: boolean;
  requiresAuth?: boolean; // renders normally; click routes to sign-in when !caps.isAuthenticated
  kind: 'action' | 'submenu' | 'checkbox' | 'radio' | 'separator';
  action?: string; // ActionId — string key into the merged registry
  value?: string; // radio item value (passed to run(value))
  children?: MenuNode[];
  visibleWhen?: (ctx: MenuContext) => boolean;
  enabledWhen?: (ctx: MenuContext) => boolean;
  state?: (ctx: MenuContext) => boolean; // checkbox checked / radio selected
};

export type MenuBarTree = { id: string; label: string; children: MenuNode[] }[];

// Projected output (renderer input) — plain data, fully resolved:
export type ProjectedNode = Omit<
  MenuNode,
  'visibleWhen' | 'enabledWhen' | 'label' | 'children' | 'state'
> & {
  label: string;
  disabled: boolean;
  checked?: boolean;
  children?: ProjectedNode[];
};
export type ProjectedMenuBar = {
  id: string;
  label: string;
  children: ProjectedNode[];
}[];
