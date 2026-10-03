import { cache } from 'fabric';
import { PRESETS } from './textPresets';

interface FontSpec {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
}

// Characters every font is loaded for up front. Google Fonts splits families
// into unicode-range subsets, so extra characters are loaded on demand below.
const BASE_SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%!?&.,-';

function collectFonts(): FontSpec[] {
  const seen = new Map<string, FontSpec>();
  for (const preset of PRESETS) {
    for (const l of preset.layers) {
      const spec: FontSpec = { family: l.font, weight: l.weight ?? 400, style: l.style ?? 'normal' };
      seen.set(`${spec.family}|${spec.weight}|${spec.style}`, spec);
    }
  }
  return [...seen.values()];
}

const FONTS = collectFonts();

function googleFontsUrl(fonts: FontSpec[]) {
  const byFamily = new Map<string, FontSpec[]>();
  for (const f of fonts) byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f]);

  const params = [...byFamily].map(([family, variants]) => {
    const name = family.replace(/ /g, '+');
    if (variants.every((v) => v.weight === 400 && v.style === 'normal')) return `family=${name}`;
    const tuples = variants
      .map((v) => [v.style === 'italic' ? 1 : 0, v.weight] as const)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(([ital, wght]) => `${ital},${wght}`);
    return `family=${name}:ital,wght@${tuples.join(';')}`;
  });
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=block`;
}

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn('[text-styles] Google Fonts stylesheet failed to load; falling back to system fonts.');
      resolve();
    };
    document.head.appendChild(link);
  });
}

let stylesheet: Promise<void> | null = null;
const loadedChars = new Set<string>();
let queue: Promise<void> = Promise.resolve();

async function loadChars(chars: string) {
  // document.fonts.load() only knows about @font-face rules that already
  // exist, so it must run after the stylesheet's onload.
  await (stylesheet ??= loadStylesheet(googleFontsUrl(FONTS)));
  await Promise.all(
    FONTS.map((f) =>
      document.fonts.load(`${f.style} ${f.weight} 48px "${f.family}"`, chars).catch((err) => {
        console.warn(`[text-styles] Could not load ${f.family}`, err);
        return [];
      }),
    ),
  );
  // Fabric caches glyph widths per font; widths measured with a fallback
  // font would make letters overlap.
  cache.clearFontCache();
}

/**
 * Resolves once every preset font is loaded for `text` (plus a base sample).
 * Cheap to call repeatedly: characters already seen resolve immediately.
 */
export function ensureFonts(text = ''): Promise<void> {
  const fresh = [...new Set(BASE_SAMPLE + text)].filter((c) => !/\s/.test(c) && !loadedChars.has(c));
  if (!fresh.length) return queue;
  fresh.forEach((c) => loadedChars.add(c));
  queue = queue.then(() => loadChars(fresh.join('')));
  return queue;
}
