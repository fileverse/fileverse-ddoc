import { describe, expect, it } from 'vitest';
import {
  COLLAB_PRESENCE_COLORS,
  assignSessionColors,
  mergePresence,
} from './presence';

const identity = (name: string) => ({
  name,
  color: '#30bced',
  isEns: '',
});

describe('mergePresence', () => {
  it('does not show sockets whose identity is unresolved', () => {
    const collaborators = mergePresence(
      ['socket-owner', 'socket-pending'],
      new Map([['socket-owner', identity('Owner')]]),
    );

    expect(collaborators.map(({ name }) => name)).toEqual(['Owner']);
  });

  it('shows one collaborator for multiple tabs with the same identity', () => {
    const collaborators = mergePresence(
      ['socket-tab-1', 'socket-tab-2'],
      new Map([
        ['socket-tab-1', identity('Owner')],
        ['socket-tab-2', identity('Owner')],
      ]),
    );

    expect(collaborators.map(({ name }) => name)).toEqual(['Owner']);
  });

  it('shows a different collaborator once their identity resolves', () => {
    const collaborators = mergePresence(
      ['socket-owner', 'socket-editor'],
      new Map([
        ['socket-owner', identity('Owner')],
        ['socket-editor', identity('Editor')],
      ]),
    );

    expect(collaborators.map(({ name }) => name)).toEqual([
      'Editor',
      'Owner',
    ]);
  });
});

describe('assignSessionColors', () => {
  it('exhausts the palette and keeps colors stable for the session', () => {
    const colors = new Map<string, string>();
    const collaborators = Array.from({ length: 9 }, (_, index) => ({
      clientId: String(index),
      name: `Person ${index}`,
      color: '#random',
      isEns: '',
    }));

    assignSessionColors(collaborators, colors);
    expect(new Set(collaborators.slice(0, 8).map(({ color }) => color)).size).toBe(
      COLLAB_PRESENCE_COLORS.length,
    );
    expect(collaborators[8].color).toBe(collaborators[0].color);

    assignSessionColors(collaborators.reverse(), colors);
    expect(collaborators.find(({ name }) => name === 'Person 0')?.color).toBe(
      COLLAB_PRESENCE_COLORS[0],
    );
  });

  it('releases departed colors before assigning duplicates', () => {
    const colors = new Map<string, string>();
    const history = Array.from({ length: 12 }, (_, index) => ({
      clientId: String(index),
      name: `Person ${index}`,
      color: '#random',
      isEns: '',
    }));
    assignSessionColors(history, colors);

    const active = [...history.slice(0, 5), ...history.slice(8)].map((user) => ({
      ...user,
    }));
    assignSessionColors(active, colors);

    expect(colors.size).toBe(9);
    expect(new Set(active.map(({ color }) => color)).size).toBe(8);
  });
});
