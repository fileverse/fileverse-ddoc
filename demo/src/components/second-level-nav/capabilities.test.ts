import { describe, it, expect } from 'vitest';
import { deriveCapabilities } from './capabilities';

const base = {
  isPreviewMode: false,
  isCollaboratorMode: false,
  isDDocOwner: false,
  isAuthenticated: true,
  isOnline: true,
  hasSelection: false,
  permissionAllowsComment: true,
};

describe('deriveCapabilities (role table, architecture doc §3)', () => {
  it('owner: everything doc-scoped', () => {
    const caps = deriveCapabilities({ ...base, isDDocOwner: true });
    expect(caps).toMatchObject({
      canEdit: true,
      canManageDoc: true,
      canShare: true,
      canExport: true,
      canCreate: true,
      canUseTools: true,
      canComment: true,
      commentRequiresAuth: false,
    });
  });

  it('signed-in viewer: no edit/manage/share/tools; export+create yes', () => {
    const caps = deriveCapabilities({ ...base, isPreviewMode: true });
    expect(caps).toMatchObject({
      canEdit: false,
      canManageDoc: false,
      canShare: false,
      canUseTools: false,
      canExport: true,
      canCreate: true,
      canComment: true,
      commentRequiresAuth: false,
    });
  });

  it('unauth viewer: like viewer, comment requires auth', () => {
    const caps = deriveCapabilities({
      ...base,
      isPreviewMode: true,
      isAuthenticated: false,
    });
    expect(caps).toMatchObject({
      canEdit: false,
      canCreate: true,
      canExport: true,
      canComment: true,
      commentRequiresAuth: true,
    });
  });

  it('collaborator (RTC): content only — D1', () => {
    const caps = deriveCapabilities({ ...base, isCollaboratorMode: true });
    expect(caps).toMatchObject({
      canEdit: true,
      canManageDoc: false,
      canShare: false,
      canUseTools: false,
      canExport: true,
      canCreate: true,
    });
  });

  it('comment follows document permission for non-owners', () => {
    const caps = deriveCapabilities({
      ...base,
      isPreviewMode: true,
      permissionAllowsComment: false,
    });
    expect(caps.canComment).toBe(false);
  });
});
