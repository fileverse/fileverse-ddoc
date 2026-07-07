import { describe, it, expect } from 'vitest';
import { projectMenu } from './project-menu';
import type { MenuBarTree, MenuContext } from './menu-types';
import { deriveCapabilities } from './capabilities';

const ctx = (
  over: Partial<Parameters<typeof deriveCapabilities>[0]> = {},
): MenuContext => ({
  caps: deriveCapabilities({
    isPreviewMode: false,
    isCollaboratorMode: false,
    isDDocOwner: true,
    isAuthenticated: true,
    isOnline: true,
    hasSelection: true,
    permissionAllowsComment: true,
    ...over,
  }),
  state: {},
});

const tree: MenuBarTree = [
  {
    id: 'insert',
    label: 'Insert',
    children: [
      {
        id: 'insert.image',
        kind: 'action',
        label: 'Image',
        action: 'insert.image',
        visibleWhen: (c) => c.caps.canEdit,
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    children: [
      {
        id: 'edit.cut',
        kind: 'action',
        label: 'Cut',
        action: 'edit.cut',
        visibleWhen: (c) => c.caps.canEdit,
        enabledWhen: (c) => c.caps.hasSelection,
      },
      { id: 'sep1', kind: 'separator' },
      {
        id: 'format.margins',
        kind: 'action',
        label: 'Margins',
        action: 'noop',
        comingSoon: true,
        visibleWhen: (c) => c.caps.canEdit,
      },
    ],
  },
];

describe('projectMenu', () => {
  it('drops hidden nodes and empty menus for a viewer', () => {
    const out = projectMenu(tree, ctx({ isDDocOwner: false, isPreviewMode: true }));
    expect(out.find((m) => m.id === 'insert')).toBeUndefined();
    expect(out.find((m) => m.id === 'edit')).toBeUndefined(); // only separator left → dropped
  });

  it('greys disabled nodes instead of hiding them', () => {
    const out = projectMenu(tree, ctx({ hasSelection: false }));
    const cut = out
      .find((m) => m.id === 'edit')!
      .children.find((n) => n.id === 'edit.cut')!;
    expect(cut.disabled).toBe(true);
  });

  it('comingSoon renders disabled regardless of capabilities', () => {
    const out = projectMenu(tree, ctx());
    const margins = out
      .find((m) => m.id === 'edit')!
      .children.find((n) => n.id === 'format.margins')!;
    expect(margins.disabled).toBe(true);
    expect(margins.comingSoon).toBe(true);
  });

  it('resolves function labels against the context', () => {
    const t: MenuBarTree = [
      {
        id: 'view',
        label: 'View',
        children: [
          {
            id: 'view.outline',
            kind: 'action',
            action: 'view.outline',
            label: (c) => (c.caps.canEdit ? 'Collapse outlines' : 'Expand outlines'),
          },
        ],
      },
    ];
    expect(projectMenu(t, ctx())[0].children[0].label).toBe('Collapse outlines');
  });

  it('collapses leading/trailing/double separators after drops', () => {
    const out = projectMenu(tree, ctx());
    const edit = out.find((m) => m.id === 'edit')!;
    expect(edit.children[0].kind).not.toBe('separator');
    expect(edit.children[edit.children.length - 1].kind).not.toBe('separator');
  });
});
