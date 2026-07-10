import { describe, it, expect } from 'vitest';
import { demoMenuTree } from './menu-tree';
import { projectMenu } from './project-menu';
import { deriveCapabilities } from './capabilities';
import type { ProjectedNode } from './menu-types';

const ctxFor = (role: 'owner' | 'viewer' | 'unauth' | 'collaborator') => ({
  caps: deriveCapabilities({
    isPreviewMode: role === 'viewer' || role === 'unauth',
    isCollaboratorMode: role === 'collaborator',
    isDDocOwner: role === 'owner',
    isAuthenticated: role !== 'unauth',
    isOnline: true,
    hasSelection: false,
    permissionAllowsComment: true,
    isRtcEnabled: false,
  }),
  state: {},
});

/** Find a node by id anywhere in a projected children tree. */
const findNode = (
  nodes: ProjectedNode[],
  id: string,
): ProjectedNode | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if ('children' in n) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

describe('demoMenuTree', () => {
  it('owner sees File/Edit/View/Insert/Format/Tools', () => {
    expect(projectMenu(demoMenuTree, ctxFor('owner')).map((m) => m.label)).toEqual(
      ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'],
    );
  });

  it('viewer sees only File/View (Help & Themes are consumer-only, dropped)', () => {
    expect(projectMenu(demoMenuTree, ctxFor('viewer')).map((m) => m.label)).toEqual(
      ['File', 'View'],
    );
  });

  it('collaborator sees File/Edit/View/Insert/Format (no Tools)', () => {
    expect(
      projectMenu(demoMenuTree, ctxFor('collaborator')).map((m) => m.label),
    ).toEqual(['File', 'Edit', 'View', 'Insert', 'Format']);
  });

  it('viewer File contains New dDoc + Import/Export + Print', () => {
    const file = projectMenu(demoMenuTree, ctxFor('viewer')).find(
      (m) => m.id === 'file',
    )!;
    expect(
      file.children.filter((c) => c.kind !== 'separator').map((c) => c.id),
    ).toEqual(['file.new', 'file.importexport', 'file.print']);
  });

  it('viewer File ▸ Import/Export projects as "Export" with only "Export as .md"', () => {
    const file = projectMenu(demoMenuTree, ctxFor('viewer')).find(
      (m) => m.id === 'file',
    )!;
    const submenu = file.children.find((c) => c.id === 'file.importexport');
    expect(submenu).toMatchObject({ kind: 'submenu', label: 'Export' });
    if (submenu?.kind !== 'submenu') throw new Error('expected submenu');
    // Import group is absent entirely.
    expect(submenu.children.find((c) => c.id === 'file.import')).toBeUndefined();
    // Export group's own label projects as '' (submenu already says "Export").
    const exportGroup = submenu.children.find(
      (c) => c.id === 'file.exportGroup',
    );
    expect(exportGroup).toMatchObject({ kind: 'group', label: '' });
    if (exportGroup?.kind !== 'group') throw new Error('expected group');
    expect(exportGroup.children).toHaveLength(1);
    expect(exportGroup.children[0]).toMatchObject({ label: 'Export as .md' });
  });

  it('collaborator File ▸ Import/Export projects as "Export" with 4 export items and no Import group', () => {
    const file = projectMenu(demoMenuTree, ctxFor('collaborator')).find(
      (m) => m.id === 'file',
    )!;
    const submenu = file.children.find((c) => c.id === 'file.importexport');
    expect(submenu).toMatchObject({ kind: 'submenu', label: 'Export' });
    if (submenu?.kind !== 'submenu') throw new Error('expected submenu');
    expect(findNode(submenu.children, 'file.import')).toBeUndefined();
    const exportGroup = submenu.children.find(
      (c) => c.id === 'file.exportGroup',
    );
    expect(exportGroup?.kind).toBe('group');
    if (exportGroup?.kind !== 'group') throw new Error('expected group');
    expect(exportGroup.children).toHaveLength(4);
  });

  it('owner File ▸ Import/Export submenu is labeled "Import/Export" and contains the Import group', () => {
    const file = projectMenu(demoMenuTree, ctxFor('owner')).find(
      (m) => m.id === 'file',
    )!;
    const submenu = file.children.find((c) => c.id === 'file.importexport');
    expect(submenu).toMatchObject({ kind: 'submenu', label: 'Import / Export' });
    if (submenu?.kind !== 'submenu') throw new Error('expected submenu');
    expect(findNode(submenu.children, 'file.import')).toBeDefined();
  });

  it('collaborator View does not contain Focus mode; owner View does', () => {
    const collaboratorView = projectMenu(demoMenuTree, ctxFor('collaborator')).find(
      (m) => m.id === 'view',
    )!;
    expect(findNode(collaboratorView.children, 'view.focusMode')).toBeUndefined();

    const ownerView = projectMenu(demoMenuTree, ctxFor('owner')).find(
      (m) => m.id === 'view',
    )!;
    expect(findNode(ownerView.children, 'view.focusMode')).toBeDefined();
  });

  it('Format contains format.columns; Insert contains no insert.columns* item', () => {
    const projected = projectMenu(demoMenuTree, ctxFor('owner'));
    const format = projected.find((m) => m.id === 'format')!;
    expect(findNode(format.children, 'format.columns')).toBeDefined();

    const insert = projected.find((m) => m.id === 'insert')!;
    const hasColumns = (nodes: ProjectedNode[]): boolean =>
      nodes.some(
        (n) =>
          n.id.startsWith('insert.columns') ||
          ('children' in n && hasColumns(n.children)),
      );
    expect(hasColumns(insert.children)).toBe(false);
  });

  it('View ▸ Zoom children labels are Fit/50%/75%/100%/150%/200%', () => {
    const view = projectMenu(demoMenuTree, ctxFor('owner')).find(
      (m) => m.id === 'view',
    )!;
    const zoom = view.children.find((c) => c.id === 'view.zoom');
    expect(zoom?.kind).toBe('submenu');
    if (zoom?.kind !== 'submenu') throw new Error('expected submenu');
    expect(zoom.children.map((c) => c.label)).toEqual([
      'Fit',
      '50%',
      '75%',
      '100%',
      '150%',
      '200%',
    ]);
  });

  it('margins is comingSoon-disabled for owner', () => {
    const format = projectMenu(demoMenuTree, ctxFor('owner')).find(
      (m) => m.id === 'format',
    )!;
    expect(format.children.find((c) => c.id === 'format.margins')!.disabled).toBe(
      true,
    );
  });

  it('every node id is unique', () => {
    const ids: string[] = [];
    const walk = (nodes: { id: string; children?: unknown[] }[]) =>
      nodes.forEach((n) => {
        ids.push(n.id);
        if (n.children) walk(n.children as never);
      });
    walk(demoMenuTree as never);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
