import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuBarRenderer } from './menu-renderer';
import type { ProjectedMenuBar } from './menu-types';

const projected: ProjectedMenuBar = [
  {
    id: 'file',
    label: 'File',
    children: [
      {
        id: 'file.rename',
        kind: 'action',
        label: 'Rename',
        action: 'file.rename',
        disabled: false,
      },
      {
        id: 'file.margins',
        kind: 'action',
        label: 'Margins',
        action: 'format.margins',
        disabled: true,
        comingSoon: true,
      },
    ],
  },
];

const openFileMenu = () => {
  fireEvent.keyDown(screen.getByRole('menuitem', { name: 'File' }), {
    key: 'Enter',
  });
};

describe('MenuBarRenderer', () => {
  it('dispatches the actionId to the registry on select', async () => {
    const run = vi.fn();
    render(
      <MenuBarRenderer projected={projected} registry={{ 'file.rename': { run } }} />,
    );
    openFileMenu();
    await waitFor(() => screen.getByText('Rename'));
    fireEvent.click(screen.getByText('Rename'));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('renders a group as a label with inline children (not a submenu)', async () => {
    const grouped: ProjectedMenuBar = [
      {
        id: 'format',
        label: 'Format',
        children: [
          {
            id: 'format.text',
            kind: 'group',
            label: 'Text',
            disabled: false,
            children: [
              {
                id: 'format.bold',
                kind: 'checkbox',
                label: 'Bold',
                action: 'format.bold',
                icon: 'Bold',
                disabled: false,
                checked: true,
              },
            ],
          },
        ],
      },
    ];
    render(
      <MenuBarRenderer
        projected={grouped}
        registry={{ 'format.bold': { run: () => {} } }}
      />,
    );
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Format' }), {
      key: 'Enter',
    });
    await waitFor(() => screen.getByText('Text'));
    // Bold is directly in the panel (inline), checked, not behind a submenu.
    const bold = screen.getByRole('menuitemcheckbox', { name: /Bold/ });
    expect(bold).toBeInTheDocument();
    expect(bold).toHaveAttribute('aria-checked', 'true');
  });

  it('a requiresAuth item click fires onRequiresAuth INSTEAD of dispatching the action', async () => {
    const run = vi.fn();
    const onRequiresAuth = vi.fn();
    const gated: ProjectedMenuBar = [
      {
        id: 'view',
        label: 'View',
        children: [
          {
            id: 'view.comments.showAll',
            kind: 'action',
            label: 'Show all comments',
            action: 'view.comments.showAll',
            disabled: false,
            requiresAuth: true,
          },
        ],
      },
    ];
    render(
      <MenuBarRenderer
        projected={gated}
        registry={{ 'view.comments.showAll': { run } }}
        onRequiresAuth={onRequiresAuth}
      />,
    );
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'View' }), {
      key: 'Enter',
    });
    await waitFor(() => screen.getByText('Show all comments'));
    fireEvent.click(screen.getByText('Show all comments'));
    expect(onRequiresAuth).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });

  it('a non-requiresAuth item click dispatches normally even when onRequiresAuth is wired', async () => {
    const run = vi.fn();
    const onRequiresAuth = vi.fn();
    render(
      <MenuBarRenderer
        projected={projected}
        registry={{ 'file.rename': { run } }}
        onRequiresAuth={onRequiresAuth}
      />,
    );
    openFileMenu();
    await waitFor(() => screen.getByText('Rename'));
    fireEvent.click(screen.getByText('Rename'));
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRequiresAuth).not.toHaveBeenCalled();
  });

  it('renders comingSoon items disabled with a Soon badge', async () => {
    render(
      <MenuBarRenderer
        projected={projected}
        registry={{ 'file.rename': { run: () => {} } }}
      />,
    );
    openFileMenu();
    await waitFor(() => screen.getByText('Margins'));
    expect(screen.getByText('Soon')).toBeInTheDocument();
    expect(screen.getByText('Margins').closest('[data-disabled]')).not.toBeNull();
  });
});
