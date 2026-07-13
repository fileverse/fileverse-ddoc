import { IDocCollabUsers } from '../types';

export interface AwarenessIdentity {
  name: string;
  color: string;
  isEns: string | boolean;
}

export const PLACEHOLDER_COLOR = '#9CA3AF';

// socketId (a sibling awareness field) → identity, keeping only states that carry both.
// Typed without `any` (the package enforces @typescript-eslint/no-explicit-any); the raw
// awareness state is `Record<string, unknown>` and narrowed here.
export function buildIdentityMap(
  states: Map<number, Record<string, unknown>>,
): Map<string, AwarenessIdentity> {
  const map = new Map<string, AwarenessIdentity>();
  states.forEach((state) => {
    const sid = state?.socketId;
    const user = state?.user as
      | { name?: string; color?: string; isEns?: string | boolean }
      | undefined;
    if (typeof sid === 'string' && user) {
      map.set(sid, {
        name: user.name ?? '',
        color: user.color ?? PLACEHOLDER_COLOR,
        isEns: user.isEns ?? '',
      });
    }
  });
  return map;
}

// Authoritative set = roomMembers. Attach identity; unmatched sockets become placeholders.
// Identified-first, then stable by socketId, so real people fill the visible avatar slots
// and a not-yet-identified socket only affects the count / +N overflow.
export function mergePresence(
  roomMembers: string[],
  identityBySocketId: Map<string, AwarenessIdentity>,
): IDocCollabUsers[] {
  const roster: IDocCollabUsers[] = roomMembers.map((socketId) => {
    const identity = identityBySocketId.get(socketId);
    if (identity) {
      return {
        clientId: socketId,
        name: identity.name,
        color: identity.color,
        isEns: identity.isEns as string,
        isPlaceholder: false,
      };
    }
    return {
      clientId: socketId,
      name: '',
      color: PLACEHOLDER_COLOR,
      isEns: '',
      isPlaceholder: true,
    };
  });

  roster.sort((a, b) => {
    if (!!a.isPlaceholder !== !!b.isPlaceholder)
      return a.isPlaceholder ? 1 : -1;
    return String(a.clientId).localeCompare(String(b.clientId));
  });
  return roster;
}

// Signature over only what the rendered roster depends on (member set + each identity),
// so cursor-position churn yields an identical signature and is skipped by callers.
export function identitySignature(
  roomMembers: string[],
  identityBySocketId: Map<string, AwarenessIdentity>,
): string {
  return roomMembers
    .slice()
    .sort()
    .map((sid) => {
      const id = identityBySocketId.get(sid);
      return id ? `${sid}:${id.name}:${id.color}:${id.isEns}` : `${sid}:?`;
    })
    .join('|');
}
