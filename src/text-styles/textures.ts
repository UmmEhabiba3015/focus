// Procedural texture tiles used as Fabric `Pattern` fills.
//
// To use real artwork instead, preload a PNG once and return it from
// getTexture() (buildPreset is synchronous, so the image must already be loaded):
//
//   const img = new Image();
//   img.src = '/textures/scribble.png';
//   await img.decode();
//   cache.set('scribble', img);   // Pattern accepts HTMLImageElement too
//
import type { TextureName } from './textPresets';

const cache = new Map<TextureName, HTMLCanvasElement | HTMLImageElement>();

/** Small seeded RNG so every tile (and every preview) looks the same. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws `draw` at the 9 wrap-around offsets so the tile repeats seamlessly. */
function tiled(ctx: CanvasRenderingContext2D, size: number, draw: () => void) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(ox, oy);
      draw();
      ctx.restore();
    }
  }
}

function makeScribble(): HTMLCanvasElement {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = rng(7);

  ctx.fillStyle = '#ff8a1f';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const colors = ['#ff5a00', '#ffb347', '#e24a00', '#ffd08a'];
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const pts = Array.from({ length: 4 }, () => [x + (rand() - 0.5) * 90, y + (rand() - 0.5) * 50]);
    const color = colors[i % colors.length];
    const width = 2 + rand() * 4;
    tiled(ctx, size, () => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      ctx.quadraticCurveTo(pts[3][0], pts[3][1], x + 10, y + 6);
      ctx.stroke();
    });
  }
  return canvas;
}

function makeBubbles(): HTMLCanvasElement {
  const size = 120;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = rng(21);

  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#ff8cc6');
  bg.addColorStop(1, '#ff5fa8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 12;
    tiled(ctx, size, () => {
      ctx.fillStyle = 'rgba(255, 214, 234, 0.75)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return canvas;
}

const makers: Record<TextureName, () => HTMLCanvasElement> = {
  scribble: makeScribble,
  bubbles: makeBubbles,
};

export function getTexture(name: TextureName): HTMLCanvasElement | HTMLImageElement {
  let tex = cache.get(name);
  if (!tex) {
    tex = makers[name]();
    cache.set(name, tex);
  }
  return tex;
}
