import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface DBlockViewHandle {
  id: string;
  dom: HTMLElement;
  gutterElement: HTMLElement;
  contentElement: HTMLElement;
  getPos: () => number;
  getNode: () => ProseMirrorNode;
  refresh: () => void;
  onCopyHeadingLink?: (link: string) => void;
}

const handleByElement = new WeakMap<Element, DBlockViewHandle>();
const registeredHandles = new Set<DBlockViewHandle>();

type DBlockDebugExtra = Record<
  string,
  boolean | number | string | null | undefined
>;

type WeakRefLike<T extends object> = {
  deref: () => T | undefined;
};

type WeakRefConstructorLike = new <T extends object>(
  target: T,
) => WeakRefLike<T>;

interface DestroyedDBlockNodeViewTargets {
  nodeView: object;
  dom: HTMLElement;
  gutterElement: HTMLElement;
  contentElement: HTMLElement;
  contentDOM: HTMLElement;
}

interface DestroyedDBlockWeakRefs {
  nodeView: WeakRefLike<object>;
  dom: WeakRefLike<HTMLElement>;
  gutterElement: WeakRefLike<HTMLElement>;
  contentElement: WeakRefLike<HTMLElement>;
  contentDOM: WeakRefLike<HTMLElement>;
}

export interface DBlockDebugSnapshot {
  event: string;
  label?: string;
  created: number;
  destroyed: number;
  registered: number;
  connected: number;
  detached: number;
  maxRegistered: number;
  unregisterMisses: number;
  [key: string]: boolean | number | string | null | undefined;
}

declare global {
  interface Window {
    __ddocDBlockDebug?: {
      snapshot: (label?: string) => DBlockDebugSnapshot;
      destroyedRefsSnapshot: (label?: string) => DBlockDebugSnapshot;
      getStats: () => DBlockDebugSnapshot;
      reset: () => DBlockDebugSnapshot;
    };
  }
}

const DBLOCK_LIFECYCLE_PREFIX = '[dblock-lifecycle]';
const DBLOCK_LIFECYCLE_LOG_DELAY_MS = 250;

const lifecycleCounters = {
  created: 0,
  destroyed: 0,
  maxRegistered: 0,
  unregisterMisses: 0,
};

const destroyedRefCounters = {
  tracked: 0,
  weakRefUnavailable: 0,
};

let destroyedWeakRefs: DestroyedDBlockWeakRefs[] = [];
let summaryLogTimeout: number | null = null;

const getWeakRefConstructor = (): WeakRefConstructorLike | null => {
  if (typeof globalThis === 'undefined' || !('WeakRef' in globalThis)) {
    return null;
  }

  return (globalThis as { WeakRef?: WeakRefConstructorLike }).WeakRef ?? null;
};

const getConnectionCounts = () => {
  let connected = 0;

  registeredHandles.forEach((handle) => {
    if (handle.dom.isConnected) {
      connected += 1;
    }
  });

  return {
    connected,
    detached: registeredHandles.size - connected,
  };
};

const buildSnapshot = (
  event: string,
  label?: string,
  extra: DBlockDebugExtra = {},
): DBlockDebugSnapshot => {
  const connectionCounts = getConnectionCounts();

  return {
    event,
    label,
    created: lifecycleCounters.created,
    destroyed: lifecycleCounters.destroyed,
    registered: registeredHandles.size,
    connected: connectionCounts.connected,
    detached: connectionCounts.detached,
    maxRegistered: lifecycleCounters.maxRegistered,
    unregisterMisses: lifecycleCounters.unregisterMisses,
    ...extra,
  };
};

const emitSnapshot = (
  event: string,
  label?: string,
  extra?: DBlockDebugExtra,
) => {
  const snapshot = buildSnapshot(event, label, extra);

  if (typeof console !== 'undefined') {
    console.info(DBLOCK_LIFECYCLE_PREFIX, JSON.stringify(snapshot));
  }

  return snapshot;
};

const scheduleLifecycleSummary = (label: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (summaryLogTimeout !== null) {
    window.clearTimeout(summaryLogTimeout);
  }

  summaryLogTimeout = window.setTimeout(() => {
    summaryLogTimeout = null;
    emitSnapshot('summary', label);
  }, DBLOCK_LIFECYCLE_LOG_DELAY_MS);
};

const countDestroyedWeakRefs = () => {
  let destroyedNodeViewsAlive = 0;
  let destroyedDomAlive = 0;
  let destroyedGutterAlive = 0;
  let destroyedContentElementAlive = 0;
  let destroyedContentDOMAlive = 0;
  const retainedRefs: DestroyedDBlockWeakRefs[] = [];

  destroyedWeakRefs.forEach((refs) => {
    const nodeViewAlive = Boolean(refs.nodeView.deref());
    const domAlive = Boolean(refs.dom.deref());
    const gutterAlive = Boolean(refs.gutterElement.deref());
    const contentElementAlive = Boolean(refs.contentElement.deref());
    const contentDOMAlive = Boolean(refs.contentDOM.deref());
    const anyAlive =
      nodeViewAlive ||
      domAlive ||
      gutterAlive ||
      contentElementAlive ||
      contentDOMAlive;

    if (nodeViewAlive) {
      destroyedNodeViewsAlive += 1;
    }
    if (domAlive) {
      destroyedDomAlive += 1;
    }
    if (gutterAlive) {
      destroyedGutterAlive += 1;
    }
    if (contentElementAlive) {
      destroyedContentElementAlive += 1;
    }
    if (contentDOMAlive) {
      destroyedContentDOMAlive += 1;
    }
    if (anyAlive) {
      retainedRefs.push(refs);
    }
  });

  destroyedWeakRefs = retainedRefs;

  return {
    destroyedRefBatchesTracked: destroyedRefCounters.tracked,
    destroyedRefBatchesRetained: destroyedWeakRefs.length,
    destroyedNodeViewsAlive,
    destroyedDomAlive,
    destroyedGutterAlive,
    destroyedContentElementAlive,
    destroyedContentDOMAlive,
    destroyedAnyAlive: destroyedWeakRefs.length,
    weakRefSupported: Boolean(getWeakRefConstructor()),
    weakRefUnavailable: destroyedRefCounters.weakRefUnavailable,
  };
};

const emitDestroyedRefsSnapshot = (label = 'manual') =>
  emitSnapshot('destroyed-refs', label, countDestroyedWeakRefs());

export const logDBlockLifecycleSnapshot = (
  label: string,
  extra?: DBlockDebugExtra,
) => emitSnapshot('snapshot', label, extra);

const resetDBlockLifecycleStats = () => {
  lifecycleCounters.created = 0;
  lifecycleCounters.destroyed = 0;
  lifecycleCounters.maxRegistered = registeredHandles.size;
  lifecycleCounters.unregisterMisses = 0;
  destroyedRefCounters.tracked = 0;
  destroyedRefCounters.weakRefUnavailable = 0;
  destroyedWeakRefs = [];

  return emitSnapshot('reset', 'manual');
};

const installDBlockDebugHelper = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.__ddocDBlockDebug = {
    snapshot: (label = 'manual') => emitSnapshot('snapshot', label),
    destroyedRefsSnapshot: emitDestroyedRefsSnapshot,
    getStats: () => buildSnapshot('stats', 'manual'),
    reset: resetDBlockLifecycleStats,
  };
};

installDBlockDebugHelper();

export const trackDestroyedDBlockNodeViewRefs = (
  targets: DestroyedDBlockNodeViewTargets,
) => {
  const WeakRefConstructor = getWeakRefConstructor();

  if (!WeakRefConstructor) {
    destroyedRefCounters.weakRefUnavailable += 1;
    return;
  }

  destroyedWeakRefs.push({
    nodeView: new WeakRefConstructor(targets.nodeView),
    dom: new WeakRefConstructor(targets.dom),
    gutterElement: new WeakRefConstructor(targets.gutterElement),
    contentElement: new WeakRefConstructor(targets.contentElement),
    contentDOM: new WeakRefConstructor(targets.contentDOM),
  });
  destroyedRefCounters.tracked += 1;
};

const isElement = (value: unknown): value is Element =>
  typeof Element !== 'undefined' && value instanceof Element;

const getElementFromTarget = (target: EventTarget | null): Element | null => {
  if (!target) {
    return null;
  }

  if (isElement(target)) {
    return target;
  }

  if (
    typeof Node !== 'undefined' &&
    target instanceof Node &&
    target.parentElement
  ) {
    return target.parentElement;
  }

  return null;
};

export const registerDBlockView = (handle: DBlockViewHandle) => {
  registeredHandles.add(handle);
  handleByElement.set(handle.dom, handle);
  handleByElement.set(handle.gutterElement, handle);
  handleByElement.set(handle.contentElement, handle);
  lifecycleCounters.created += 1;
  lifecycleCounters.maxRegistered = Math.max(
    lifecycleCounters.maxRegistered,
    registeredHandles.size,
  );
  scheduleLifecycleSummary('register');

  return () => {
    const didDelete = registeredHandles.delete(handle);
    if (didDelete) {
      lifecycleCounters.destroyed += 1;
    } else {
      lifecycleCounters.unregisterMisses += 1;
    }

    handleByElement.delete(handle.dom);
    handleByElement.delete(handle.gutterElement);
    handleByElement.delete(handle.contentElement);
    scheduleLifecycleSummary(didDelete ? 'unregister' : 'unregister-miss');
  };
};

export const getDBlockViewFromElement = (
  element: Element | null,
): DBlockViewHandle | null => {
  if (!element) {
    return null;
  }

  const registeredElement = element.closest(
    '[data-dblock-node-view], [data-dblock-gutter], [data-dblock-content-shell]',
  );

  return registeredElement
    ? (handleByElement.get(registeredElement) ?? null)
    : null;
};

export const getDBlockViewFromEventTarget = (
  target: EventTarget | null,
): DBlockViewHandle | null =>
  getDBlockViewFromElement(getElementFromTarget(target));

export const refreshRegisteredDBlockViews = () => {
  registeredHandles.forEach((handle) => {
    if (handle.dom.isConnected) {
      handle.refresh();
    }
  });
  emitSnapshot('refresh', 'refreshRegisteredDBlockViews');
};
