// The authorship floor is the highest seq the client has applied as an ordered
// range read. A range read returns a gapless PREFIX of the update rows above the
// cursor (snapshot rows consume seqs but are excluded from the tail, so
// non-consecutive integers are expected and are NOT a gap). Live broadcasts carry
// no seq and never reach this function, so they never advance the floor — which is
// exactly what keeps an owner-authored snapshot's floorSeq honest.
export function advanceFloor(floor: number, pageSeqsAscending: number[]): number {
  let next = floor;
  for (const seq of pageSeqsAscending) {
    if (seq > next) next = seq;
  }
  return next;
}

// Owner-only snapshot cadence. The server also enforces owner-only authorship; this
// just avoids doing the client work for non-owners. The floor is advanced by a
// catch-up read inside the authoring routine, so it is not a precondition here.
export function shouldAuthorSnapshot(p: {
  isOwner: boolean;
  updatesSinceLastSnapshot: number;
  threshold: number;
}): boolean {
  return p.isOwner && p.updatesSinceLastSnapshot >= p.threshold;
}
