import * as Y from 'yjs';
import type { CommentAnchor } from '../extensions/comment/comment-decoration-plugin';
import type { SerializedCommentAnchor } from '../types';

export const getSerializedCommentAnchorsKey = (
  anchors?: SerializedCommentAnchor[],
) => {
  if (!anchors || anchors.length === 0) {
    return null;
  }

  return anchors
    .map(
      (anchor) =>
        `${anchor.id}:${anchor.anchorFrom}:${anchor.anchorTo}:${anchor.resolved}:${anchor.deleted}`,
    )
    .join(',');
};

export const deserializeCommentAnchors = (
  anchors?: SerializedCommentAnchor[],
): CommentAnchor[] => {
  if (!anchors || anchors.length === 0) {
    return [];
  }

  return anchors
    .map((anchor) => {
      try {
        return {
          id: anchor.id,
          anchorFrom: Y.decodeRelativePosition(
            Uint8Array.from(atob(anchor.anchorFrom), (char) =>
              char.charCodeAt(0),
            ),
          ),
          anchorTo: Y.decodeRelativePosition(
            Uint8Array.from(atob(anchor.anchorTo), (char) =>
              char.charCodeAt(0),
            ),
          ),
          resolved: anchor.resolved,
          deleted: anchor.deleted,
        };
      } catch {
        return null;
      }
    })
    .filter((anchor): anchor is CommentAnchor => anchor !== null);
};
