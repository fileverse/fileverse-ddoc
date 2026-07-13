import { describe, it, expect } from 'vitest';
import {
  mergeRegistries,
  assertTreeResolves,
  registryToMenuState,
} from './action-registry';
import type { MenuBarTree } from './menu-types';

describe('action registry', () => {
  it('merges sources, later wins', () => {
    const a = { 'x.one': { run: () => {} } };
    const b = { 'x.one': { run: () => {} }, 'x.two': { run: () => {} } };
    const merged = mergeRegistries(a, b);
    expect(Object.keys(merged).sort()).toEqual(['x.one', 'x.two']);
    expect(merged['x.one']).toBe(b['x.one']);
  });

  it('assertTreeResolves throws naming every unresolved actionId', () => {
    const tree: MenuBarTree = [
      {
        id: 'file',
        label: 'File',
        children: [
          { id: 'a', kind: 'action', label: 'A', action: 'file.known' },
          { id: 'b', kind: 'action', label: 'B', action: 'file.missing' },
          {
            id: 'sub',
            kind: 'submenu',
            label: 'S',
            children: [
              { id: 'c', kind: 'action', label: 'C', action: 'file.alsoMissing' },
            ],
          },
        ],
      },
    ];
    expect(() =>
      assertTreeResolves(tree, { 'file.known': { run: () => {} } }),
    ).toThrowError(/file\.missing/);
    expect(() =>
      assertTreeResolves(tree, { 'file.known': { run: () => {} } }),
    ).toThrowError(/file\.alsoMissing/);
  });

  it('comingSoon nodes are exempt from resolution', () => {
    const tree: MenuBarTree = [
      {
        id: 'format',
        label: 'Format',
        children: [
          {
            id: 'm',
            kind: 'action',
            label: 'Margins',
            action: 'format.margins',
            comingSoon: true,
          },
        ],
      },
    ];
    expect(() => assertTreeResolves(tree, {})).not.toThrow();
  });

  it('registryToMenuState projects reactive fields', () => {
    const state = registryToMenuState({
      'format.bold': { run: () => {}, isActive: true, isEnabled: true },
    });
    expect(state['format.bold']).toEqual({
      isActive: true,
      isEnabled: true,
      current: undefined,
    });
  });
});
