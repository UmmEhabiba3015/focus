// Text style presets. Everything here is plain JSON-serialisable data;
// buildPreset.ts turns a preset + the user's text into a Fabric Group.
//
// Sizes are in editor units (the editor canvas is 540×675).

/** Which slice of the text a layer draws. */
export type Part = 'all' | 'first' | 'rest';

export type TextCase = 'upper' | 'lower' | 'none';

export type TextureName = 'scribble' | 'bubbles';

export interface ShadowSpec {
  color: string;
  blur: number;
  offsetX?: number;
  offsetY?: number;
}

export interface GradientSpec {
  direction: 'vertical' | 'horizontal';
  stops: { offset: number; color: string }[];
}

export interface Layer {
  part: Part;
  font: string;
  weight?: number;
  style?: 'normal' | 'italic';
  size: number;
  /** Use exactly one of fill / gradient / texture. */
  fill?: string;
  gradient?: GradientSpec;
  texture?: TextureName;
  stroke?: string;
  strokeWidth?: number;
  shadow?: ShadowSpec;
  opacity?: number;
  angle?: number;
  dx?: number;
  dy?: number;
  /** Fabric units: thousandths of an em. */
  charSpacing?: number;
  case?: TextCase;
}

export interface BoxSpec {
  fill: string;
  /** [horizontal, vertical] padding around the text. */
  padding: [number, number];
  /** Corner radius; clamped to half the box height, so 999 gives a pill. */
  radius?: number;
  angle?: number;
  stroke?: string;
  strokeWidth?: number;
  shadow?: ShadowSpec;
}

export interface TextPreset {
  id: string;
  name: string;
  layers: Layer[];
  box?: BoxSpec;
  /** Rotation of the whole style, applied inside the group so user rotation stays separate. */
  angle?: number;
  /** Vertical gap between the `first` and `rest` rows. Negative values overlap them. */
  lineGap?: number;
  /** Backdrop colour for the preview card. */
  previewBg?: string;
}

export const PRESETS: TextPreset[] = [
  {
    id: 'bold-moves',
    name: 'Bold Moves',
    angle: -8,
    lineGap: -18,
    previewBg: '#fff4e6',
    layers: [
      { part: 'first', font: 'Permanent Marker', size: 84, fill: '#ff6a13', case: 'upper' },
      { part: 'rest', font: 'Permanent Marker', size: 64, fill: '#1f4fff', case: 'upper' },
    ],
  },
  {
    id: 'spooky-glow',
    name: 'Spooky Glow',
    previewBg: '#1a1026',
    layers: [
      { part: 'all', font: 'Creepster', size: 84, fill: '#ff7a00', charSpacing: 40, case: 'upper', shadow: { color: '#9b30ff', blur: 34 } },
      { part: 'all', font: 'Creepster', size: 84, fill: '#ff7a00', charSpacing: 40, case: 'upper', shadow: { color: 'rgba(190, 90, 255, 0.9)', blur: 10 } },
    ],
  },
  {
    id: 'glitch',
    name: 'Glitch',
    previewBg: '#e9e9ee',
    box: { fill: '#050505', padding: [26, 12] },
    layers: [
      { part: 'all', font: 'Rubik Glitch', size: 68, fill: '#ff1f5a', opacity: 0.9, dx: -5, dy: 1, case: 'upper' },
      { part: 'all', font: 'Rubik Glitch', size: 68, fill: '#00e5ff', opacity: 0.9, dx: 5, dy: -1, case: 'upper' },
      { part: 'all', font: 'Rubik Glitch', size: 68, fill: '#39ff14', case: 'upper' },
    ],
  },
  {
    id: 'wet-paint-script',
    name: 'Wet Paint + Script',
    lineGap: -26,
    previewBg: '#f5f1ea',
    layers: [
      { part: 'first', font: 'Rubik Wet Paint', size: 88, fill: '#8a8a8a', case: 'upper' },
      { part: 'rest', font: 'Pacifico', size: 54, fill: '#e3262e', angle: -5, dy: 4 },
    ],
  },
  {
    id: 'poster-block',
    name: 'Poster Block',
    previewBg: '#fff3c4',
    layers: [
      {
        part: 'all',
        font: 'Bungee',
        size: 64,
        fill: '#27d3f5',
        stroke: '#141433',
        strokeWidth: 8,
        shadow: { color: '#141433', blur: 0, offsetX: 6, offsetY: 6 },
        case: 'upper',
      },
    ],
  },
  {
    id: 'scribble-fill',
    name: 'Scribble Fill',
    lineGap: -8,
    previewBg: '#fbf7f0',
    layers: [
      { part: 'first', font: 'Bebas Neue', size: 48, fill: '#6b6b6b', charSpacing: 300, case: 'upper' },
      { part: 'rest', font: 'Permanent Marker', size: 96, texture: 'scribble', stroke: '#c2410c', strokeWidth: 1.5, case: 'upper' },
    ],
  },
  {
    id: 'drip-outline',
    name: 'Drip Outline',
    previewBg: '#241a33',
    layers: [
      { part: 'all', font: 'Nosifer', size: 56, fill: '#ff7a00', stroke: '#ffd400', strokeWidth: 14, case: 'upper' },
    ],
  },
  {
    id: 'chrome-y2k',
    name: 'Chrome Y2K',
    previewBg: '#3b2f7a',
    layers: [
      {
        part: 'all',
        font: 'Bungee',
        size: 72,
        gradient: {
          direction: 'vertical',
          stops: [
            { offset: 0, color: '#ffffff' },
            { offset: 0.42, color: '#c3c8d1' },
            { offset: 0.5, color: '#5d6573' },
            { offset: 0.58, color: '#d6dae1' },
            { offset: 1, color: '#f8fafc' },
          ],
        },
        stroke: '#4b5563',
        strokeWidth: 1.5,
        shadow: { color: 'rgba(0, 0, 0, 0.45)', blur: 8, offsetX: 3, offsetY: 5 },
        case: 'upper',
      },
    ],
  },
  {
    id: 'puffy-bubble',
    name: 'Puffy Bubble',
    previewBg: '#bfe6ff',
    layers: [
      {
        part: 'all',
        font: 'Rubik Bubbles',
        size: 76,
        texture: 'bubbles',
        stroke: '#ffffff',
        strokeWidth: 10,
        shadow: { color: '#6d28d9', blur: 0, offsetX: 5, offsetY: 6 },
      },
    ],
  },
  {
    id: 'neon-sign',
    name: 'Neon Sign',
    previewBg: '#ece7f5',
    box: { fill: '#1c1426', padding: [42, 16], radius: 999, stroke: '#ff2d95', strokeWidth: 2 },
    layers: [
      { part: 'all', font: 'Pacifico', size: 58, fill: '#ffe4f1', shadow: { color: '#ff2d95', blur: 30 } },
      { part: 'all', font: 'Pacifico', size: 58, fill: '#ffe4f1', shadow: { color: '#ff5cae', blur: 8 } },
    ],
  },
  {
    id: 'tape-label',
    name: 'Tape Label',
    angle: -4,
    previewBg: '#e6ecf2',
    box: { fill: '#ffd60a', padding: [28, 4], radius: 2, shadow: { color: 'rgba(0, 0, 0, 0.25)', blur: 6, offsetY: 3 } },
    layers: [{ part: 'all', font: 'Bebas Neue', size: 68, fill: '#111111', charSpacing: 60, case: 'upper' }],
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    lineGap: -10,
    previewBg: '#f6f1e7',
    layers: [
      { part: 'first', font: 'Playfair Display', weight: 700, style: 'italic', size: 64, fill: '#1d1d1f', charSpacing: 80, case: 'upper' },
      { part: 'rest', font: 'Great Vibes', size: 58, fill: '#b8860b' },
    ],
  },
];

export const PRESET_BY_ID: Record<string, TextPreset> = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
