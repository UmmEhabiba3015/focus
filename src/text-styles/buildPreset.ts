import { FabricText, Gradient, Group, Pattern, Rect, Shadow, type FabricObject } from 'fabric';
import type { Layer, Part, ShadowSpec, TextCase, TextPreset } from './textPresets';
import { getTexture } from './textures';

export interface StyleInfo {
  presetId: string;
  text: string;
}

// Which preset (and text) produced each group. A WeakMap keeps this out of
// Fabric's serialisation and lets entries disappear with the objects.
const styleOf = new WeakMap<FabricObject, StyleInfo>();

export function getStyleInfo(obj: FabricObject | null | undefined): StyleInfo | undefined {
  return obj ? styleOf.get(obj) : undefined;
}

function applyCase(text: string, c: TextCase | undefined) {
  if (c === 'upper') return text.toUpperCase();
  if (c === 'lower') return text.toLowerCase();
  return text;
}

function makeShadow(spec: ShadowSpec | undefined) {
  if (!spec) return null;
  return new Shadow({ color: spec.color, blur: spec.blur, offsetX: spec.offsetX ?? 0, offsetY: spec.offsetY ?? 0 });
}

function makeFill(layer: Layer) {
  if (layer.texture) {
    return new Pattern({ source: getTexture(layer.texture), repeat: 'repeat' });
  }
  if (layer.gradient) {
    const vertical = layer.gradient.direction === 'vertical';
    return new Gradient<'linear'>({
      type: 'linear',
      gradientUnits: 'percentage',
      coords: { x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 },
      colorStops: layer.gradient.stops,
    });
  }
  return layer.fill ?? '#000000';
}

function makeText(layer: Layer, content: string) {
  return new FabricText(applyCase(content, layer.case), {
    fontFamily: layer.font,
    fontSize: layer.size,
    fontWeight: layer.weight ?? 'normal',
    fontStyle: layer.style ?? 'normal',
    fill: makeFill(layer),
    stroke: layer.stroke ?? null,
    strokeWidth: layer.stroke ? (layer.strokeWidth ?? 1) : 0,
    strokeLineJoin: 'round',
    // Outline sits behind the fill instead of eating into the letters.
    paintFirst: layer.stroke ? 'stroke' : 'fill',
    shadow: makeShadow(layer.shadow),
    opacity: layer.opacity ?? 1,
    charSpacing: layer.charSpacing ?? 0,
    lineHeight: 1,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
  });
}

/**
 * Builds a Fabric Group for `preset` showing `rawText`.
 * Two-line presets put the first word on one row (`first` layers) and the
 * remaining words below it (`rest` layers). Layers in the same row are stacked
 * on top of each other, shifted by dx/dy.
 */
export function buildPreset(preset: TextPreset, rawText: string): Group | null {
  const text = rawText.trim();
  if (!text) return null;

  const words = text.split(/\s+/);
  const single = words.length < 2;
  const contentFor: Record<Part, string> = {
    all: text,
    first: words[0],
    rest: single ? text : words.slice(1).join(' '),
  };

  const rows: { layer: Layer; obj: FabricText }[][] = [];
  for (const part of ['all', 'first', 'rest'] as const) {
    // A single word would otherwise show twice (once as `first`, once as `rest`).
    if (part === 'first' && single) continue;
    const layers = preset.layers.filter((l) => l.part === part);
    if (layers.length) rows.push(layers.map((layer) => ({ layer, obj: makeText(layer, contentFor[part]) })));
  }
  if (!rows.length) return null;

  // Stack rows vertically, centred on (0, 0).
  const gap = preset.lineGap ?? 0;
  const heights = rows.map((row) => Math.max(...row.map(({ obj }) => obj.height)));
  const total = heights.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
  let y = -total / 2;
  rows.forEach((row, i) => {
    const cy = y + heights[i] / 2;
    for (const { layer, obj } of row) {
      obj.set({ left: layer.dx ?? 0, top: cy + (layer.dy ?? 0), angle: layer.angle ?? 0 });
      obj.setCoords();
    }
    y += heights[i] + gap;
  });

  // Groups don't cache: a cached group clips child shadows/glows at its bounds.
  let content: Group = new Group(
    rows.flatMap((row) => row.map(({ obj }) => obj)),
    { objectCaching: false },
  );

  if (preset.box) {
    const { box } = preset;
    const [px, py] = box.padding;
    const center = content.getCenterPoint();
    const height = content.height + py * 2;
    const rect = new Rect({
      width: content.width + px * 2,
      height,
      rx: Math.min(box.radius ?? 0, height / 2),
      ry: Math.min(box.radius ?? 0, height / 2),
      fill: box.fill,
      stroke: box.stroke ?? null,
      strokeWidth: box.stroke ? (box.strokeWidth ?? 1) : 0,
      shadow: makeShadow(box.shadow),
      angle: box.angle ?? 0,
      originX: 'center',
      originY: 'center',
      left: center.x,
      top: center.y,
    });
    content = new Group([rect, content], { objectCaching: false });
  }

  // The preset's own rotation lives on an inner group, so the outer group's
  // angle is purely the user's rotation and survives style swaps.
  if (preset.angle) {
    content.set({ angle: preset.angle });
    content.setCoords();
    content = new Group([content], { objectCaching: false });
  }

  content.set({ originX: 'center', originY: 'center' });
  styleOf.set(content, { presetId: preset.id, text });
  return content;
}
