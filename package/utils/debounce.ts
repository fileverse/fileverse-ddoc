export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  flush: () => void;
  cancel: () => void;
};

export function debounce<A extends unknown[]>(
  func: (...args: A) => unknown,
  wait: number,
): Debounced<A> {
  let h: ReturnType<typeof setTimeout> | undefined;
  let pendingArgs: A | null = null;

  const callable = (...args: A) => {
    pendingArgs = args;
    if (h) clearTimeout(h);
    h = setTimeout(() => {
      h = undefined;
      const a = pendingArgs;
      pendingArgs = null;
      if (a) func(...a);
    }, wait);
  };

  (callable as Debounced<A>).flush = () => {
    if (h) {
      clearTimeout(h);
      h = undefined;
    }
    const a = pendingArgs;
    pendingArgs = null;
    if (a) func(...a);
  };

  (callable as Debounced<A>).cancel = () => {
    if (h) {
      clearTimeout(h);
      h = undefined;
    }
    pendingArgs = null;
  };

  return callable as Debounced<A>;
}
