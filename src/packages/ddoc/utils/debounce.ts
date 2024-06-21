/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-types
export function debounce<T extends (...args: any) => any>(func: T, wait: number): T {
  let h: NodeJS.Timeout;

  const callable = (...args: Parameters<T>) => {
      clearTimeout(h);
      h = setTimeout(() => func(...args), wait);
  };

  return callable as unknown as T;
}