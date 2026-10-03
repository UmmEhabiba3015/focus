import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Canvas, FabricImage, Point, type FabricObject } from 'fabric';
import { buildPreset, getStyleInfo } from './buildPreset';
import { ensureFonts } from './fonts';
import { PRESETS, PRESET_BY_ID, type TextPreset } from './textPresets';
import { StylePreview } from './StylePreview';
import './textStyles.css';

const W = 540;
const H = 675;
const EXPORT_WIDTH = 1080;
const DEBOUNCE_MS = 120;

export interface TextEditorProps {
  photoUrl: string;
  initialText?: string;
  onExportImage?: (dataUrl: string) => void;
  onExportTextLayer?: (dataUrl: string) => void;
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function decorate(obj: FabricObject) {
  obj.set({
    transparentCorners: false,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#7c3aed',
    borderColor: '#7c3aed',
    cornerSize: 12,
    padding: 6,
  });
}

/** Swaps `old` for a freshly built group, keeping position, angle, scale and stacking order. */
function replaceStyled(canvas: Canvas, old: FabricObject, preset: TextPreset, text: string) {
  const next = buildPreset(preset, text);
  if (!next) return;
  decorate(next);
  next.set({ scaleX: old.scaleX, scaleY: old.scaleY, angle: old.angle, flipX: old.flipX, flipY: old.flipY });
  next.setPositionByOrigin(old.getCenterPoint(), 'center', 'center');
  next.setCoords();
  const index = canvas.getObjects().indexOf(old);
  canvas.remove(old);
  canvas.insertAt(index, next);
  canvas.setActiveObject(next);
  canvas.requestRenderAll();
}

export default function TextEditor({ photoUrl, initialText = 'Eid Offer 50%', onExportImage, onExportTextLayer }: TextEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const [text, setText] = useState(initialText);
  /** Debounced text whose glyphs are loaded in every preset font; null until the first load. */
  const [readyText, setReadyText] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState(photoUrl);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => setBgUrl(photoUrl), [photoUrl]);

  // text → (debounce) → fonts loaded for those characters → readyText
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      ensureFonts(text).then(() => {
        if (!cancelled) setReadyText(text);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [text]);

  // Create the editor canvas once.
  useEffect(() => {
    const host = hostRef.current!;
    const wrap = wrapRef.current!;
    const el = document.createElement('canvas');
    host.appendChild(el);
    const canvas = new Canvas(el, { width: W, height: H, preserveObjectStacking: true, backgroundColor: '#d9dbe3' });
    canvasRef.current = canvas;

    const syncSelection = () => {
      const active = canvas.getActiveObject();
      const info = getStyleInfo(active);
      setHasSelection(!!active);
      setSelectedPreset(info?.presetId ?? null);
      if (info) setText(info.text);
    };
    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', syncSelection);

    // Scale the whole scene to the container; objects keep 540×675 coordinates.
    const resize = () => {
      const scale = Math.min(1, wrap.clientWidth / W);
      canvas.setDimensions({ width: W * scale, height: H * scale });
      canvas.setZoom(scale);
      canvas.requestRenderAll();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    return () => {
      observer.disconnect();
      canvasRef.current = null;
      void canvas.dispose();
      host.replaceChildren();
    };
  }, []);

  // Background photo, scaled to cover the canvas.
  useEffect(() => {
    let cancelled = false;
    FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const scale = Math.max(W / img.width, H / img.height);
        img.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center', left: W / 2, top: H / 2 });
        canvas.backgroundImage = img;
        canvas.requestRenderAll();
      })
      .catch((err) => console.warn('[text-styles] Could not load photo', err));
    return () => {
      cancelled = true;
    };
  }, [bgUrl]);

  // Typing while a styled text is selected rewrites that text.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || readyText === null || !readyText.trim()) return;
    const active = canvas.getActiveObject();
    const info = getStyleInfo(active);
    if (active && info && info.text !== readyText.trim()) {
      replaceStyled(canvas, active, PRESET_BY_ID[info.presetId], readyText);
    }
  }, [readyText]);

  const applyPreset = useCallback(
    (preset: TextPreset) => {
      const canvas = canvasRef.current;
      if (!canvas || readyText === null) return;
      const content = readyText.trim() || preset.name;
      const active = canvas.getActiveObject();
      if (active && getStyleInfo(active)) {
        replaceStyled(canvas, active, preset, content);
        return;
      }
      const group = buildPreset(preset, content);
      if (!group) return;
      decorate(group);
      const fit = Math.min(1, (W * 0.85) / group.width, (H * 0.5) / group.height);
      group.scale(fit);
      group.setPositionByOrigin(new Point(W / 2, H / 2), 'center', 'center');
      group.setCoords();
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
    },
    [readyText],
  );

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (!objects.length) return;
    canvas.discardActiveObject();
    canvas.remove(...objects);
    canvas.requestRenderAll();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      deleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelected]);

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const exportPng = (textOnly: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { backgroundImage, backgroundColor } = canvas;
    if (textOnly) {
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = '';
    }
    // The canvas is displayed at `zoom`, so scale from its on-screen width.
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: EXPORT_WIDTH / canvas.getWidth() });
    if (textOnly) {
      canvas.backgroundImage = backgroundImage;
      canvas.backgroundColor = backgroundColor;
    }
    canvas.requestRenderAll();

    if (textOnly) (onExportTextLayer ?? ((u) => download(u, 'text-layer.png')))(dataUrl);
    else (onExportImage ?? ((u) => download(u, 'design.png')))(dataUrl);
  };

  const loading = readyText === null;

  return (
    <div className="ts-editor">
      <section className="ts-stage">
        <div className="ts-canvas-wrap" ref={wrapRef}>
          <div ref={hostRef} />
        </div>
        <div className="ts-actions">
          <button type="button" onClick={() => fileRef.current?.click()}>
            Upload photo
          </button>
          <button type="button" onClick={deleteSelected} disabled={!hasSelection}>
            Delete
          </button>
          <button type="button" onClick={() => exportPng(false)}>
            Export PNG
          </button>
          <button type="button" onClick={() => exportPng(true)}>
            Export text layer
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
        </div>
      </section>

      <section className="ts-panel">
        <label className="ts-label" htmlFor="ts-text">
          Your text
        </label>
        <input
          id="ts-text"
          className="ts-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something…"
          autoComplete="off"
        />
        <p className="ts-hint">
          {loading
            ? 'Loading fonts…'
            : selectedPreset
              ? 'Editing the selected text. Pick a style to swap it, or click empty canvas to deselect.'
              : 'Pick a style to add it to the photo.'}
        </p>
        <div className="ts-grid">
          {PRESETS.map((preset) => (
            <StylePreview
              key={preset.id}
              preset={preset}
              text={readyText}
              active={preset.id === selectedPreset}
              onSelect={applyPreset}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
