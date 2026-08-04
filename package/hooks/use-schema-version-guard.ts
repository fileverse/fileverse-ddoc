import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import {
  DDOC_META_ROOT_KEY,
  isDocSchemaSupported,
} from '../utils/schema-version';

// True when the doc declares a schema newer than this build supports.
// Editors must never bind to such a doc: a stale client editing a
// newer-schema doc writes structure newer clients cannot reconcile, and
// Yjs has no undo for that. The meta map is observed because the marker
// can arrive after mount via IndexedDB replay or a collab sync.
export const useSchemaVersionGuard = (ydoc: Y.Doc) => {
  const [isSchemaUnsupported, setIsSchemaUnsupported] = useState(
    () => !isDocSchemaSupported(ydoc),
  );

  useEffect(() => {
    const metaMap = ydoc.getMap(DDOC_META_ROOT_KEY);
    const evaluate = () => setIsSchemaUnsupported(!isDocSchemaSupported(ydoc));
    // Re-check on effect attach: the marker may have arrived between the
    // initial state computation and the observer being registered.
    evaluate();
    metaMap.observe(evaluate);
    return () => metaMap.unobserve(evaluate);
  }, [ydoc]);

  return isSchemaUnsupported;
};
