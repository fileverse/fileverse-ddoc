// demo/src/components/second-level-nav/capabilities.ts
// Doc-type-neutral capability bundle (dsheets assessment D-C): nothing in this
// file may reference ddoc/Tiptap concepts.

export type DocumentCapabilities = {
  canEdit: boolean;
  canComment: boolean;
  commentRequiresAuth: boolean;
  canManageDoc: boolean;
  canShare: boolean;
  canExport: boolean;
  canCreate: boolean;
  canUseTools: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  hasSelection: boolean;
};

export function deriveCapabilities(input: {
  isPreviewMode: boolean;
  isCollaboratorMode: boolean;
  isDDocOwner: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  hasSelection: boolean;
  permissionAllowsComment: boolean;
}): DocumentCapabilities {
  const {
    isPreviewMode,
    isCollaboratorMode,
    isDDocOwner,
    isAuthenticated,
    isOnline,
    hasSelection,
    permissionAllowsComment,
  } = input;

  const isOwner = isDDocOwner && !isPreviewMode;
  const canEdit = isOwner || isCollaboratorMode;

  return {
    canEdit,
    canComment: isOwner || permissionAllowsComment,
    commentRequiresAuth: !isOwner && !isAuthenticated,
    canManageDoc: isOwner,
    canShare: isOwner,
    canExport: true, // universal (role table)
    canCreate: true, // universal incl. unauth (D9)
    canUseTools: isOwner,
    isAuthenticated,
    isOnline,
    hasSelection,
  };
}
