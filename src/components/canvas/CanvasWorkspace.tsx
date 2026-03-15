'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';

export type CanvasTool = 'pen' | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface StrokeEvent {
  id: string;
  points: StrokePoint[];
  tool: CanvasTool;
  color: string;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
}

export interface CanvasSnapshot {
  imageDataUrl: string;
  width: number;
  height: number;
  generatedAt: number;
  strokes: StrokeEvent[];
}

interface CanvasWorkspaceProps {
  snapshotIntervalMs?: number;
  onSnapshot?: (snapshot: CanvasSnapshot) => void;
  onStrokeOutput?: (stroke: StrokeEvent, allStrokes: StrokeEvent[]) => void;
}

const AVAILABLE_COLORS = ['#0f172a', '#f59e0b', '#6d28d9'];

export default function CanvasWorkspace({
  snapshotIntervalMs = 3000,
  onSnapshot,
  onStrokeOutput,
}: CanvasWorkspaceProps) {
  const { canvasSnapshotEvents, confirmedExpression, latestOcrParse, ocrStatus, ocrError } = useAppState();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(AVAILABLE_COLORS[0]);
  const [strokes, setStrokes] = useState<StrokeEvent[]>([]);

  const activeStrokeIdRef = useRef<string | null>(null);

  const getPointerPosition = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure || 0.5,
      timestamp: Date.now(),
    };
  }, []);

  const redrawStrokes = useCallback((ctx: CanvasRenderingContext2D, allStrokes: StrokeEvent[]) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 1) {
        return;
      }

      ctx.save();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? 18 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.beginPath();
      const [firstPoint, ...remainingPoints] = stroke.points;
      ctx.moveTo(firstPoint.x, firstPoint.y);
      remainingPoints.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = stage.getBoundingClientRect();

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawStrokes(context, strokes);
    };

    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(stage);
    window.addEventListener('resize', resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [redrawStrokes, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const finalizeStroke = (pointerId: number) => {
      if (!activeStrokeIdRef.current) {
        return;
      }

      const completedStrokeId = activeStrokeIdRef.current;
      activeStrokeIdRef.current = null;
      canvas.releasePointerCapture(pointerId);

      setStrokes((previousStrokes) => {
        const now = Date.now();
        const updatedStrokes = previousStrokes.map((stroke) =>
          stroke.id === completedStrokeId ? { ...stroke, endedAt: now, updatedAt: now } : stroke,
        );

        const completedStroke = updatedStrokes.find((stroke) => stroke.id === completedStrokeId);
        if (completedStroke && onStrokeOutput) {
          onStrokeOutput(completedStroke, updatedStrokes);
        }

        return updatedStrokes;
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = getPointerPosition(event);
      if (!point) {
        return;
      }

      const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      activeStrokeIdRef.current = strokeId;
      canvas.setPointerCapture(event.pointerId);

      const initialStroke: StrokeEvent = {
        id: strokeId,
        tool: activeTool,
        color: activeColor,
        points: [point],
        startedAt: point.timestamp,
        updatedAt: point.timestamp,
      };

      setStrokes((previousStrokes) => [...previousStrokes, initialStroke]);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeStrokeIdRef.current) {
        return;
      }

      const point = getPointerPosition(event);
      if (!point) {
        return;
      }

      const currentStrokeId = activeStrokeIdRef.current;
      setStrokes((previousStrokes) => {
        const nextStrokes = previousStrokes.map((stroke) =>
          stroke.id === currentStrokeId
            ? {
                ...stroke,
                updatedAt: point.timestamp,
                points: [...stroke.points, point],
              }
            : stroke,
        );

        redrawStrokes(context, nextStrokes);
        return nextStrokes;
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      finalizeStroke(event.pointerId);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finalizeStroke(event.pointerId);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [activeColor, activeTool, getPointerPosition, onStrokeOutput, redrawStrokes]);

  const snapshotPayload = useMemo(() => ({ strokes }), [strokes]);

  useEffect(() => {
    if (!onSnapshot) {
      return;
    }

    const emitSnapshot = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      onSnapshot({
        imageDataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        generatedAt: Date.now(),
        strokes: snapshotPayload.strokes,
      });
    };

    emitSnapshot();
    const interval = window.setInterval(emitSnapshot, snapshotIntervalMs);

    return () => window.clearInterval(interval);
  }, [onSnapshot, snapshotIntervalMs, snapshotPayload]);

  const latestSnapshot = canvasSnapshotEvents[canvasSnapshotEvents.length - 1];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        ref={stageRef}
        className="flex-grow bg-white dark:bg-[#1a110b] border border-slate-200 dark:border-primary/20 rounded-xl shadow-inner canvas-grid relative overflow-hidden"
      >
        <div className="absolute top-4 left-6 flex items-center gap-4 bg-white/90 dark:bg-background-dark/90 px-3 py-2 rounded-lg border border-slate-200 dark:border-primary/20 backdrop-blur-sm shadow-sm z-10">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-primary/20">
            <button
              type="button"
              aria-label="Select pen tool"
              onClick={() => setActiveTool('pen')}
              className={`w-8 h-8 rounded flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                activeTool === 'pen'
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button
              type="button"
              aria-label="Select eraser tool"
              onClick={() => setActiveTool('eraser')}
              className={`w-8 h-8 rounded flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                activeTool === 'eraser'
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">ink_eraser</span>
            </button>
            <button
              type="button"
              aria-label="Gesture tool unavailable"
              className="w-8 h-8 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="material-symbols-outlined text-sm">gesture</span>
            </button>
          </div>
          <div className="flex gap-2" role="group" aria-label="Ink colors">
            {AVAILABLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Select ${color} ink color`}
                onClick={() => setActiveColor(color)}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  activeColor === color ? 'border-primary scale-110 shadow-sm' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
          <button
            type="button"
            className="px-3 py-1.5 bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>RECORD SESSION</span>
          </button>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        <div className="absolute inset-0 p-20 flex flex-col items-center justify-center opacity-80 pointer-events-none">
          <div className="max-w-md space-y-8">
            <div className="text-4xl font-display text-slate-800 dark:text-slate-200 italic opacity-60">
              {latestSnapshot?.label ?? 'Waiting for canvas input...'}
            </div>
            <div className="text-3xl font-display text-primary italic border-l-4 border-primary/40 pl-6 py-2">
              {confirmedExpression?.latex ?? 'No confirmed expression yet'}
            </div>
            <div className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 tracking-widest">
              OCR {ocrStatus}
              {latestOcrParse ? ` • Confidence ${(latestOcrParse.confidence * 100).toFixed(1)}%` : ''}
              {ocrError ? ` • ${ocrError}` : ''}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center pointer-events-none">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Last snapshot: {latestSnapshot?.id ?? 'none'}
          </div>
          <div className="text-[10px] font-mono text-slate-400 uppercase">Snapshots: {canvasSnapshotEvents.length}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl">
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Step-by-Step Hint
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Identify Error
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-primary/20 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Synthesize Proof
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <span className="material-symbols-outlined text-sm">function</span>
            <span>Convert to LaTeX</span>
          </button>
        </div>
      </div>
    </div>
  );
}
