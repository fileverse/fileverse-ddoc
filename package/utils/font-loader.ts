import type { FontDescriptor } from '../types';

const catalog = new Map<string, FontDescriptor>();
const loaded = new Map<string, Promise<void>>();

/** "Poppins, sans-serif" -> "Poppins"; "'Times New Roman', serif" -> "Times New Roman" */
export function primaryToken(family: string): string {
  const first = family.split(',')[0]?.trim() ?? '';
  return first.replace(/^['"]|['"]$/g, '').replace(/['"]$/g, '');
}

export function registerFonts(fonts: FontDescriptor[]): void {
  catalog.clear();
  for (const f of fonts) catalog.set(primaryToken(f.family), f);
}

export function getRegisteredFonts(): FontDescriptor[] {
  return [...catalog.values()];
}

export function isLoaded(family: string): boolean {
  const desc = catalog.get(primaryToken(family));
  if (!desc?.url) return true;
  const entries =
    typeof desc.url === 'string' ? [[400, desc.url]] : Object.entries(desc.url);
  return entries.every(([w]) => loaded.has(`${desc.name}|${w}`));
}

export async function ensureLoaded(family: string): Promise<void> {
  if (typeof document === 'undefined') return;
  const desc = catalog.get(primaryToken(family));
  if (!desc?.url) return;

  const entries: Array<[number, string]> =
    typeof desc.url === 'string'
      ? [[400, desc.url]]
      : Object.entries(desc.url).map(([w, u]) => [Number(w), u]);

  const weightPromises = entries.map(([weight, url]) => {
    const key = `${desc.name}|${weight}`;
    let p = loaded.get(key);
    if (!p) {
      const face = new FontFace(desc.name, `url(${url}) format('woff2')`, {
        weight: String(weight),
        display: 'swap',
      });
      p = face
        .load()
        .then((f) => {
          document.fonts.add(f);
        })
        .catch((err) => {
          loaded.delete(key);
          // eslint-disable-next-line no-console
          console.warn(`Font ${desc.name} ${weight} failed to load`, err);
        });
      loaded.set(key, p);
    }
    return p;
  });

  await Promise.allSettled(weightPromises);
}
