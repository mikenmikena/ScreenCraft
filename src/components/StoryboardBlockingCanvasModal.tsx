import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Edit3,
  X,
  Check,
  RotateCcw,
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Triangle,
  PaintBucket,
  Eraser,
  Grid,
  Undo2,
  Redo2,
  Magnet,
} from 'lucide-react';
import { StoryboardFrame } from '../types/story';

export type DrawTool =
  | 'brush'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'fill'
  | 'eraser';

export type FillPattern =
  | 'none'
  | 'solid'
  | 'hatch'
  | 'crosshatch'
  | 'dots'
  | 'stripes'
  | 'checker';

export type GridMode = 'square' | 'fine' | 'thirds' | 'perspective';

interface StoryboardBlockingCanvasModalProps {
  frame: StoryboardFrame;
  aspectRatio?: '16:9' | '2.39:1' | '4:3';
  onClose: () => void;
  onSave: (frameId: string, dataUrl: string) => void;
}

const CANVAS_WIDTH = 720;
const CANVAS_BG = '#1c1c1c';
const BRUSH_SIZES = [1, 2, 4, 8, 10, 14];

const PALETTE_COLORS = [
  { color: '#ffffff', label: 'White (Sketch)' },
  { color: '#f59e0b', label: 'Amber (Camera / Motion)' },
  { color: '#ef4444', label: 'Red (Danger / Action)' },
  { color: '#3b82f6', label: 'Blue (Actor Blocking)' },
  { color: '#10b981', label: 'Green (Set / Props)' },
  { color: '#a855f7', label: 'Purple (Lighting / FX)' },
  { color: '#94a3b8', label: 'Slate (Depth / Shadow)' },
];

const PATTERN_OPTIONS: { id: FillPattern; label: string }[] = [
  { id: 'none', label: 'Outline' },
  { id: 'solid', label: 'Solid' },
  { id: 'hatch', label: 'Hatch' },
  { id: 'crosshatch', label: 'Cross' },
  { id: 'dots', label: 'Dots' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'checker', label: 'Checker' },
];

function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [255, 255, 255, alpha];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

function createCanvasPattern(
  ctx: CanvasRenderingContext2D,
  pattern: FillPattern,
  color: string
): string | CanvasPattern {
  if (pattern === 'solid' || pattern === 'none') {
    return color;
  }

  const tile = document.createElement('canvas');
  const size = pattern === 'dots' ? 12 : pattern === 'checker' ? 16 : 12;
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  if (!tctx) return color;

  tctx.clearRect(0, 0, size, size);
  tctx.strokeStyle = color;
  tctx.fillStyle = color;
  tctx.lineWidth = 1.5;

  switch (pattern) {
    case 'hatch': {
      tctx.beginPath();
      tctx.moveTo(-2, size + 2);
      tctx.lineTo(size + 2, -2);
      tctx.moveTo(-2, 2);
      tctx.lineTo(2, -2);
      tctx.moveTo(size - 2, size + 2);
      tctx.lineTo(size + 2, size - 2);
      tctx.stroke();
      break;
    }
    case 'crosshatch': {
      tctx.beginPath();
      tctx.moveTo(-2, size + 2);
      tctx.lineTo(size + 2, -2);
      tctx.moveTo(-2, -2);
      tctx.lineTo(size + 2, size + 2);
      tctx.stroke();
      break;
    }
    case 'dots': {
      tctx.beginPath();
      tctx.arc(3, 3, 1.6, 0, Math.PI * 2);
      tctx.arc(9, 9, 1.6, 0, Math.PI * 2);
      tctx.fill();
      break;
    }
    case 'stripes': {
      tctx.fillRect(0, 0, size, 2.5);
      tctx.fillRect(0, size / 2, size, 2.5);
      break;
    }
    case 'checker': {
      const half = size / 2;
      tctx.globalAlpha = 0.85;
      tctx.fillRect(0, 0, half, half);
      tctx.fillRect(half, half, half, half);
      break;
    }
  }

  return ctx.createPattern(tile, 'repeat') || color;
}

function renderPatternSwatch(pattern: FillPattern, color: string) {
  switch (pattern) {
    case 'none':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="2" y="2" width="12" height="12" fill="none" stroke={color} strokeWidth="1.5" />
          <line x1="2" y1="14" x2="14" y2="2" stroke="#ef4444" strokeWidth="1.2" />
        </svg>
      );
    case 'solid':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="2" y="2" width="12" height="12" fill={color} rx="1" />
        </svg>
      );
    case 'hatch':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke={color} strokeWidth="1" />
          <line x1="2" y1="8" x2="8" y2="2" stroke={color} strokeWidth="1.3" />
          <line x1="2" y1="14" x2="14" y2="2" stroke={color} strokeWidth="1.3" />
          <line x1="8" y1="14" x2="14" y2="8" stroke={color} strokeWidth="1.3" />
        </svg>
      );
    case 'crosshatch':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke={color} strokeWidth="1" />
          <line x1="2" y1="14" x2="14" y2="2" stroke={color} strokeWidth="1.2" />
          <line x1="2" y1="2" x2="14" y2="14" stroke={color} strokeWidth="1.2" />
          <line x1="2" y1="8" x2="8" y2="2" stroke={color} strokeWidth="1" />
          <line x1="8" y1="14" x2="14" y2="8" stroke={color} strokeWidth="1" />
        </svg>
      );
    case 'dots':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="5" cy="5" r="1.3" fill={color} />
          <circle cx="11" cy="5" r="1.3" fill={color} />
          <circle cx="8" cy="8" r="1.3" fill={color} />
          <circle cx="5" cy="11" r="1.3" fill={color} />
          <circle cx="11" cy="11" r="1.3" fill={color} />
        </svg>
      );
    case 'stripes':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke={color} strokeWidth="1" />
          <line x1="2" y1="5" x2="14" y2="5" stroke={color} strokeWidth="1.6" />
          <line x1="2" y1="8.5" x2="14" y2="8.5" stroke={color} strokeWidth="1.6" />
          <line x1="2" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1.6" />
        </svg>
      );
    case 'checker':
      return (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke={color} strokeWidth="1" />
          <rect x="2" y="2" width="4" height="4" fill={color} />
          <rect x="10" y="2" width="4" height="4" fill={color} />
          <rect x="6" y="6" width="4" height="4" fill={color} />
          <rect x="2" y="10" width="4" height="4" fill={color} />
          <rect x="10" y="10" width="4" height="4" fill={color} />
        </svg>
      );
  }
}

export const StoryboardBlockingCanvasModal: React.FC<StoryboardBlockingCanvasModalProps> = ({
  frame,
  aspectRatio = '16:9',
  onClose,
  onSave,
}) => {
  const canvasHeight =
    aspectRatio === '2.39:1' ? 302 : aspectRatio === '4:3' ? 540 : 405;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const [tool, setTool] = useState<DrawTool>('brush');
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [fillPattern, setFillPattern] = useState<FillPattern>('none');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gridMode, setGridMode] = useState<GridMode>('square');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [historyMeta, setHistoryMeta] = useState<{ index: number; total: number }>({
    index: -1,
    total: 0,
  });

  const pushHistory = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(imgData);
    // Keep up to 35 history states to bound memory
    if (trimmed.length > 35) {
      trimmed.shift();
    }
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryMeta({ index: historyIndexRef.current, total: trimmed.length });
  }, []);

  // Initialize canvas with existing frame artwork
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);
    historyRef.current = [];
    historyIndexRef.current = -1;

    if (frame.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, canvasHeight);
        pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
      };
      img.onerror = () => {
        pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
      };
      img.src = frame.imageUrl;
    } else {
      pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
    }
  }, [frame.id, frame.imageUrl, canvasHeight, pushHistory]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current -= 1;
    const target = historyRef.current[historyIndexRef.current];
    if (target) {
      ctx.putImageData(target, 0, 0);
      setHistoryMeta({
        index: historyIndexRef.current,
        total: historyRef.current.length,
      });
    }
  }, []);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current += 1;
    const target = historyRef.current[historyIndexRef.current];
    if (target) {
      ctx.putImageData(target, 0, 0);
      setHistoryMeta({
        index: historyIndexRef.current,
        total: historyRef.current.length,
      });
    }
  }, []);

  // Keyboard shortcuts inside modal (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const gridSpacing = gridMode === 'fine' ? 12 : 24;

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    let y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (
      snapToGrid &&
      showGrid &&
      (gridMode === 'square' || gridMode === 'fine') &&
      tool !== 'brush' &&
      tool !== 'eraser' &&
      tool !== 'fill'
    ) {
      x = Math.round(x / gridSpacing) * gridSpacing;
      y = Math.round(y / gridSpacing) * gridSpacing;
    }

    return { x, y };
  };

  const applyFloodFill = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    activePattern: FillPattern,
    color: string
  ) => {
    const w = CANVAS_WIDTH;
    const h = canvasHeight;
    const sx = Math.max(0, Math.min(w - 1, Math.floor(startX)));
    const sy = Math.max(0, Math.min(h - 1, Math.floor(startY)));

    const srcImage = ctx.getImageData(0, 0, w, h);
    const data = srcImage.data;
    const startIdx = (sy * w + sx) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    const effectivePattern: FillPattern = activePattern === 'none' ? 'solid' : activePattern;

    // Short-circuit if solid fill matches target pixel color
    if (effectivePattern === 'solid') {
      const [fr, fg, fb, fa] = hexToRgba(color);
      if (
        Math.abs(targetR - fr) <= 4 &&
        Math.abs(targetG - fg) <= 4 &&
        Math.abs(targetB - fb) <= 4 &&
        Math.abs(targetA - fa) <= 4
      ) {
        return;
      }
    }

    const tolerance = 34;
    const matchesTarget = (pixelIdx: number) => {
      const dr = Math.abs(data[pixelIdx] - targetR);
      const dg = Math.abs(data[pixelIdx + 1] - targetG);
      const db = Math.abs(data[pixelIdx + 2] - targetB);
      const da = Math.abs(data[pixelIdx + 3] - targetA);
      return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
    };

    const mask = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let sp = 0;
    stack[sp++] = sy * w + sx;
    mask[sy * w + sx] = 1;

    while (sp > 0) {
      const pos = stack[--sp];
      const x = pos % w;
      const y = (pos - x) / w;

      if (x > 0) {
        const left = pos - 1;
        if (!mask[left] && matchesTarget(left * 4)) {
          mask[left] = 1;
          stack[sp++] = left;
        }
      }
      if (x < w - 1) {
        const right = pos + 1;
        if (!mask[right] && matchesTarget(right * 4)) {
          mask[right] = 1;
          stack[sp++] = right;
        }
      }
      if (y > 0) {
        const up = pos - w;
        if (!mask[up] && matchesTarget(up * 4)) {
          mask[up] = 1;
          stack[sp++] = up;
        }
      }
      if (y < h - 1) {
        const down = pos + w;
        if (!mask[down] && matchesTarget(down * 4)) {
          mask[down] = 1;
          stack[sp++] = down;
        }
      }
    }

    if (effectivePattern === 'solid') {
      const [fr, fg, fb, fa] = hexToRgba(color);
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
          const idx = i * 4;
          data[idx] = fr;
          data[idx + 1] = fg;
          data[idx + 2] = fb;
          data[idx + 3] = fa;
        }
      }
      ctx.putImageData(srcImage, 0, 0);
    } else {
      // Render pattern onto an offscreen surface and composite only masked pixels
      const patCanvas = document.createElement('canvas');
      patCanvas.width = w;
      patCanvas.height = h;
      const pctx = patCanvas.getContext('2d');
      if (!pctx) return;

      pctx.fillStyle = CANVAS_BG;
      pctx.fillRect(0, 0, w, h);
      pctx.fillStyle = createCanvasPattern(pctx, effectivePattern, color);
      pctx.fillRect(0, 0, w, h);

      const patData = pctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
          const idx = i * 4;
          data[idx] = patData[idx];
          data[idx + 1] = patData[idx + 1];
          data[idx + 2] = patData[idx + 2];
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(srcImage, 0, 0);
    }
  };

  const drawShapePreview = (
    ctx: CanvasRenderingContext2D,
    activeTool: DrawTool,
    start: { x: number; y: number },
    end: { x: number; y: number },
    shiftKey: boolean
  ) => {
    let x1 = start.x;
    let y1 = start.y;
    let x2 = end.x;
    let y2 = end.y;

    if (shiftKey && (activeTool === 'line' || activeTool === 'arrow')) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(dx, dy);
      x2 = x1 + Math.cos(snappedAngle) * len;
      y2 = y1 + Math.sin(snappedAngle) * len;
    }

    if (shiftKey && (activeTool === 'rect' || activeTool === 'circle')) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      x2 = x1 + (dx >= 0 ? side : -side);
      y2 = y1 + (dy >= 0 ? side : -side);
    }

    const offset = brushSize === 1 ? 0.5 : 0;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const fillStyle =
      fillPattern !== 'none' ? createCanvasPattern(ctx, fillPattern, brushColor) : null;

    if (activeTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(Math.round(x1) + offset, Math.round(y1) + offset);
      ctx.lineTo(Math.round(x2) + offset, Math.round(y2) + offset);
      ctx.stroke();
      return;
    }

    if (activeTool === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(10, brushSize * 2.8);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = brushColor;
      ctx.fill();
      return;
    }

    if (activeTool === 'rect') {
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      ctx.beginPath();
      ctx.rect(Math.round(rx) + offset, Math.round(ry) + offset, Math.round(rw), Math.round(rh));
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      ctx.stroke();
      return;
    }

    if (activeTool === 'circle') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const radX = Math.max(1, Math.abs(x2 - x1) / 2);
      const radY = Math.max(1, Math.abs(y2 - y1) / 2);

      ctx.beginPath();
      ctx.ellipse(cx, cy, radX, radY, 0, 0, Math.PI * 2);
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      ctx.stroke();
      return;
    }

    if (activeTool === 'triangle') {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const topY = Math.min(y1, y2);
      const botY = Math.max(y1, y2);
      const midX = (minX + maxX) / 2;

      ctx.beginPath();
      ctx.moveTo(midX, topY);
      ctx.lineTo(maxX, botY);
      ctx.lineTo(minX, botY);
      ctx.closePath();
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      ctx.stroke();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pt = getCanvasPoint(e);

    if (tool === 'fill') {
      applyFloodFill(ctx, pt.x, pt.y, fillPattern, brushColor);
      pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
      return;
    }

    startPointRef.current = pt;
    setIsDrawing(true);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.strokeStyle = tool === 'eraser' ? CANVAS_BG : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw single dot immediately on click
      ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
      ctx.stroke();
    } else {
      snapshotRef.current = ctx.getImageData(0, 0, CANVAS_WIDTH, canvasHeight);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pt = getCanvasPoint(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (snapshotRef.current && startPointRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      drawShapePreview(ctx, tool, startPointRef.current, pt, e.shiftKey);
    }
  };

  const finishStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    snapshotRef.current = null;
    startPointRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);
    pushHistory(ctx, CANVAS_WIDTH, canvasHeight);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    onSave(frame.id, canvasRef.current.toDataURL());
  };

  const toolButtons: { id: DrawTool; label: string; icon: React.ReactNode }[] = [
    { id: 'brush', label: 'Freehand Brush', icon: <Pencil className="w-3.5 h-3.5" /> },
    { id: 'line', label: 'Straight Line (Hold Shift to snap angle)', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'arrow', label: 'Blocking / Camera Arrow', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'rect', label: 'Rectangle (Hold Shift for square)', icon: <Square className="w-3.5 h-3.5" /> },
    { id: 'circle', label: 'Circle / Ellipse (Hold Shift for circle)', icon: <Circle className="w-3.5 h-3.5" /> },
    { id: 'triangle', label: 'Triangle', icon: <Triangle className="w-3.5 h-3.5" /> },
    { id: 'fill', label: 'Fill / Pattern Bucket', icon: <PaintBucket className="w-3.5 h-3.5" /> },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-3.5 h-3.5" /> },
  ];

  const isShapeOrFill =
    tool === 'rect' || tool === 'circle' || tool === 'triangle' || tool === 'fill';

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100">
              Storyboard Blocking Canvas — Shot {frame.shotNumber}
            </span>
            <span className="text-[10px] font-mono text-gray-400 bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#3a3a3a]">
              {aspectRatio} ({CANVAS_WIDTH}×{canvasHeight})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#333]"
            aria-label="Close blocking canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 1: Tools, Colors, Undo/Redo, Clear */}
        <div className="px-4 py-2 bg-[#202020] border-b border-[#343434] flex flex-wrap items-center justify-between gap-2">
          {/* Drawing Tools */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 mr-1 font-semibold">Tool:</span>
            {toolButtons.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTool(tb.id)}
                title={tb.label}
                className={`px-2 py-1.5 rounded flex items-center space-x-1 border transition-colors ${
                  tool === tb.id
                    ? 'bg-[#ff7700] border-[#ff8c1a] text-black font-bold shadow'
                    : 'bg-[#2c2c2c] border-[#3d3d3d] text-gray-300 hover:bg-[#383838] hover:text-white'
                }`}
              >
                {tb.icon}
                <span className="hidden sm:inline text-[11px] capitalize">{tb.id}</span>
              </button>
            ))}
          </div>

          {/* Undo / Redo & Clear */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyMeta.index <= 0}
              title="Undo (Ctrl+Z)"
              className="px-2 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] disabled:opacity-35 text-gray-200 rounded border border-[#3e3e3e] flex items-center space-x-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyMeta.index >= historyMeta.total - 1}
              title="Redo (Ctrl+Y)"
              className="px-2 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] disabled:opacity-35 text-gray-200 rounded border border-[#3e3e3e] flex items-center space-x-1"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>
            <button
              type="button"
              onClick={handleClearCanvas}
              className="px-2.5 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] text-gray-300 hover:text-red-400 rounded border border-[#3e3e3e] flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Row 2: Color Palette, Brush Sizes (1px–14px), Pattern Fills, Grid Toggle */}
        <div className="px-4 py-2 bg-[#1c1c1c] border-b border-[#383838] flex flex-wrap items-center justify-between gap-3">
          {/* Palette */}
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400 font-semibold">Color:</span>
            {PALETTE_COLORS.map((item) => (
              <button
                key={item.color}
                type="button"
                onClick={() => {
                  setBrushColor(item.color);
                  if (tool === 'eraser') setTool('brush');
                }}
                style={{ backgroundColor: item.color }}
                title={item.label}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  brushColor.toLowerCase() === item.color && tool !== 'eraser'
                    ? 'scale-125 border-white ring-2 ring-[#ff7700]'
                    : 'border-gray-600 hover:scale-110'
                }`}
              />
            ))}
            <label
              className="ml-1 flex items-center space-x-1 cursor-pointer bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#3e3e3e] hover:border-gray-500"
              title="Custom Color"
            >
              <input
                type="color"
                value={brushColor}
                onChange={(e) => {
                  setBrushColor(e.target.value);
                  if (tool === 'eraser') setTool('brush');
                }}
                className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
              />
              <span className="text-[10px] text-gray-300 font-mono">Hex</span>
            </label>
          </div>

          {/* Stroke / Brush Size (includes 1px & 10px) */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 font-semibold mr-0.5">Size:</span>
            {BRUSH_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                className={`px-1.5 h-6 min-w-[30px] rounded flex items-center justify-center font-mono text-[11px] border transition-colors ${
                  brushSize === sz
                    ? 'bg-[#ff7700] border-[#ff8c1a] text-black font-bold'
                    : 'bg-[#2b2b2b] border-[#3d3d3d] text-gray-300 hover:bg-[#363636]'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* Shape / Bucket Pattern Fill */}
          <div
            className={`flex items-center space-x-1 ${
              isShapeOrFill ? 'opacity-100' : 'opacity-70'
            }`}
          >
            <span className="text-gray-400 font-semibold mr-0.5">Fill:</span>
            {PATTERN_OPTIONS.map((pat) => (
              <button
                key={pat.id}
                type="button"
                onClick={() => setFillPattern(pat.id)}
                title={`Fill mode: ${pat.label}`}
                className={`px-1.5 py-1 rounded flex items-center space-x-1 border transition-colors ${
                  fillPattern === pat.id
                    ? 'bg-[#3d2e1e] border-[#ff7700] text-amber-300 font-semibold'
                    : 'bg-[#2a2a2a] border-[#3c3c3c] text-gray-300 hover:bg-[#353535]'
                }`}
              >
                {renderPatternSwatch(pat.id, brushColor)}
                <span className="hidden xl:inline text-[10px]">{pat.label}</span>
              </button>
            ))}
          </div>

          {/* Grid Controls (On/Off + Style + Snap) */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowGrid((prev) => !prev)}
              className={`px-2 py-1 rounded border flex items-center space-x-1 font-semibold transition-colors ${
                showGrid
                  ? 'bg-[#1e3a3a] border-cyan-400 text-cyan-300'
                  : 'bg-[#2a2a2a] border-[#3e3e3e] text-gray-400 hover:text-white'
              }`}
              title="Turn Blocking Grid On / Off"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid: {showGrid ? 'ON' : 'OFF'}</span>
            </button>

            {showGrid && (
              <>
                <select
                  value={gridMode}
                  onChange={(e) => setGridMode(e.target.value as GridMode)}
                  className="bg-[#2a2a2a] text-cyan-200 text-[11px] px-1.5 py-1 rounded border border-[#3e3e3e] focus:outline-none focus:border-cyan-400"
                  title="Grid Overlay Type"
                >
                  <option value="square">24px Grid</option>
                  <option value="fine">12px Fine Grid</option>
                  <option value="thirds">Rule of Thirds</option>
                  <option value="perspective">Perspective Cross</option>
                </select>

                {(gridMode === 'square' || gridMode === 'fine') && (
                  <button
                    type="button"
                    onClick={() => setSnapToGrid((prev) => !prev)}
                    title="Snap lines and shapes to grid"
                    className={`px-1.5 py-1 rounded border flex items-center space-x-1 text-[11px] ${
                      snapToGrid
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-[#2a2a2a] border-[#3e3e3e] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Magnet className="w-3 h-3" />
                    <span>Snap</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Canvas Viewport with Non-Destructive Grid Overlay */}
        <div className="p-5 bg-[#151515] flex items-center justify-center overflow-auto">
          <div
            className="relative rounded border-2 border-[#444] shadow-2xl overflow-hidden bg-[#1c1c1c]"
            style={{ width: `${CANVAS_WIDTH}px`, maxWidth: '100%', aspectRatio: `${CANVAS_WIDTH} / ${canvasHeight}` }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishStroke}
              onMouseLeave={finishStroke}
              className="w-full h-full block cursor-crosshair"
            />

            {/* Non-destructive Toggleable Grid Overlay */}
            {showGrid && (
              <svg
                viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
              >
                {(gridMode === 'square' || gridMode === 'fine') && (
                  <>
                    <defs>
                      <pattern
                        id="blocking-square-grid"
                        width={gridSpacing}
                        height={gridSpacing}
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`}
                          fill="none"
                          stroke="rgba(56, 189, 248, 0.22)"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect
                      width={CANVAS_WIDTH}
                      height={canvasHeight}
                      fill="url(#blocking-square-grid)"
                    />
                    {/* Subtle center axis */}
                    <line
                      x1={CANVAS_WIDTH / 2}
                      y1={0}
                      x2={CANVAS_WIDTH / 2}
                      y2={canvasHeight}
                      stroke="rgba(56, 189, 248, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={0}
                      y1={canvasHeight / 2}
                      x2={CANVAS_WIDTH}
                      y2={canvasHeight / 2}
                      stroke="rgba(56, 189, 248, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  </>
                )}

                {gridMode === 'thirds' && (
                  <g stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1">
                    <line x1={CANVAS_WIDTH / 3} y1={0} x2={CANVAS_WIDTH / 3} y2={canvasHeight} />
                    <line x1={(CANVAS_WIDTH * 2) / 3} y1={0} x2={(CANVAS_WIDTH * 2) / 3} y2={canvasHeight} />
                    <line x1={0} y1={canvasHeight / 3} x2={CANVAS_WIDTH} y2={canvasHeight / 3} />
                    <line x1={0} y1={(canvasHeight * 2) / 3} x2={CANVAS_WIDTH} y2={(canvasHeight * 2) / 3} />
                    <circle
                      cx={CANVAS_WIDTH / 2}
                      cy={canvasHeight / 2}
                      r="5"
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.6)"
                    />
                  </g>
                )}

                {gridMode === 'perspective' && (
                  <g stroke="rgba(56, 189, 248, 0.38)" strokeWidth="1" strokeDasharray="5 4">
                    <line x1={0} y1={0} x2={CANVAS_WIDTH} y2={canvasHeight} />
                    <line x1={CANVAS_WIDTH} y1={0} x2={0} y2={canvasHeight} />
                    <line x1={0} y1={canvasHeight / 2} x2={CANVAS_WIDTH} y2={canvasHeight / 2} strokeDasharray="none" stroke="rgba(245, 158, 11, 0.45)" />
                    <line x1={CANVAS_WIDTH / 2} y1={0} x2={CANVAS_WIDTH / 2} y2={canvasHeight} strokeDasharray="none" stroke="rgba(56, 189, 248, 0.45)" />
                  </g>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#1d1d1d] border-t border-[#383838] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400 font-sans">
            Tip: Use Lines, Arrows, Shapes &amp; Pattern Fills for blocking zones. Hold <kbd className="px-1 py-0.5 bg-[#2a2a2a] rounded border border-[#444] text-gray-200 font-mono text-[10px]">Shift</kbd> to constrain angles/squares. Grid is a visual guide and will not bake into saved shots.
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded shadow flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Sketch to Frame</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
