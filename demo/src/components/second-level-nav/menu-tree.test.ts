import { describe, it, expect } from 'vitest';
import { demoMenuTree } from './menu-tree';
import { projectMenu } from './project-menu';
import { deriveCapabilities } from './capabilities';

const ctxFor = (role: 'owner' | 'viewer' | 'unauth') => ({
  caps: deriveCapabilities({
    isPreviewMode: role !== 'owner',
    isCollaboratorMode: false,
    isDDocOwner: role === 'owner',
    isAuthenticated: role !== 'unauth',
    isOnline: true,
    hasSelection: false,
    permissionAllowsComment: true,
  }),
  state: {},
});

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

  it('viewer File contains only New dDoc + Export', () => {
    const file = projectMenu(demoMenuTree, ctxFor('viewer')).find(
      (m) => m.id === 'file',
    )!;
    expect(
      file.children.filter((c) => c.kind !== 'separator').map((c) => c.id),
    ).toEqual(['file.new', 'file.export.viewer']);
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
