import { useEffect, useRef } from 'react';
import { StaticCanvas } from 'fabric';
import { buildPreset } from './buildPreset';
import type { TextPreset } from './textPresets';

const PREVIEW_W = 240;
const PREVIEW_H = 150;
const PADDING = 14;

interface StylePreviewProps {
  preset: TextPreset;
  /** Text to render; null while fonts are still loading. */
  text: string | null;
  active: boolean;
  onSelect: (preset: TextPreset) => void;
}

export function StylePreview({ preset, text, active, onSelect }: StylePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<StaticCanvas | null>(null);

  useEffect(() => {
    // Create the <canvas> ourselves so Fabric never touches a React-owned node.
    const el = document.createElement('canvas');
    hostRef.current!.appendChild(el);
    const canvas = new StaticCanvas(el, {
      width: PREVIEW_W,
      height: PREVIEW_H,
      backgroundColor: preset.previewBg ?? '#f1f1f4',
      renderOnAddRemove: false,
    });
    canvasRef.current = canvas;
    return () => {
      canvasRef.current = null;
      void canvas.dispose();
      el.remove();
    };
  }, [preset.previewBg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || text === null) return;
    canvas.remove(...canvas.getObjects());
    const group = buildPreset(preset, text || preset.name);
    if (group) {
      const scale = Math.min((PREVIEW_W - PADDING * 2) / group.width, (PREVIEW_H - PADDING * 2) / group.height, 1);
      group.set({ scaleX: scale, scaleY: scale, left: PREVIEW_W / 2, top: PREVIEW_H / 2 });
      canvas.add(group);
    }
    canvas.renderAll();
  }, [preset, text]);

  return (
    <button
      type="button"
      className={`ts-card${active ? ' is-active' : ''}`}
      onClick={() => onSelect(preset)}
      disabled={text === null}
      aria-pressed={active}
    >
      <div className="ts-card-canvas" ref={hostRef} />
      <span className="ts-card-name">{preset.name}</span>
    </button>
  );
}
