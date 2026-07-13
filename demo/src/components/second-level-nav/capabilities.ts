// demo/src/components/second-level-nav/capabilities.ts
// Doc-type-neutral capability bundle (dsheets assessment D-C): nothing in this
// file may reference ddoc/Tiptap concepts.

export type DocumentCapabilities = {
  canEdit: boolean;
  canComment: boolean;
  commentRequiresAuth: boolean;
  /** canComment AND the technical prerequisites the comment control itself
   *  checks (online, not mid-RTC, document published) — see isCommentUsable
   *  input below. Drives enabledWhen on the View ▸ Comments submenu so it's
   *  visible-but-disabled instead of falsely interactable (TEC-1458
   *  bugfix). */
  canUseComments: boolean;
  canManageDoc: boolean;
  canSplitView: boolean;
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
  isRtcEnabled: boolean;
  /** Real comment availability — the SAME signals the demo's comment control
   *  gates on (its collab/publish equivalents; see App.tsx). Distinct from
   *  `canComment` (permission/role) and `commentRequiresAuth` (auth gate):
   *  this is purely "is the feature technically usable right now". */
  isCommentUsable: boolean;
}): DocumentCapabilities {
  const {
    isPreviewMode,
    isCollaboratorMode,
    isDDocOwner,
    isAuthenticated,
    isOnline,
    hasSelection,
    permissionAllowsComment,
    isCommentUsable,
  } = input;

  const isOwner = isDDocOwner && !isPreviewMode;
  const canEdit = isOwner || isCollaboratorMode;
  const canManageDoc = isOwner;
  const canComment = isOwner || permissionAllowsComment;

  return {
    canEdit,
    canComment,
    commentRequiresAuth: !isOwner && !isAuthenticated,
    canUseComments: canComment && isCommentUsable,
    canManageDoc,
    canSplitView: canManageDoc && !input.isRtcEnabled,
    canShare: isOwner,
    canExport: true, // universal (role table)
    canCreate: true, // universal incl. unauth (D9)
    canUseTools: isOwner,
    isAuthenticated,
    isOnline,
    hasSelection,
  };
}
