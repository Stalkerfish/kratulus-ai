import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
          stroke.id === completedStrokeId
            ? { ...stroke, endedAt: now, updatedAt: now }
            : stroke,
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

      canvas.setPointerCapture(event.pointerId);

      const now = Date.now();
      const newStroke: StrokeEvent = {
        id: crypto.randomUUID(),
        points: [point],
        tool: activeTool,
        color: activeColor,
        startedAt: now,
        updatedAt: now,
      };

      activeStrokeIdRef.current = newStroke.id;
      setStrokes((previousStrokes) => {
        const updatedStrokes = [...previousStrokes, newStroke];
        redrawStrokes(context, updatedStrokes);
        return updatedStrokes;
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeStrokeIdRef.current) {
        return;
      }

      const point = getPointerPosition(event);
      if (!point) {
        return;
      }

      const activeStrokeId = activeStrokeIdRef.current;
      setStrokes((previousStrokes) => {
        const now = Date.now();
        const updatedStrokes = previousStrokes.map((stroke) =>
          stroke.id === activeStrokeId
            ? { ...stroke, points: [...stroke.points, point], updatedAt: now }
            : stroke,
        );
        redrawStrokes(context, updatedStrokes);
        return updatedStrokes;
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
    canvas.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
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

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        ref={stageRef}
        className="flex-grow bg-white dark:bg-[#1a110b] border border-slate-200 dark:border-primary/20 rounded-xl shadow-inner canvas-grid relative overflow-hidden"
      >
        <div className="absolute top-4 left-6 flex items-center gap-4 bg-white/90 dark:bg-background-dark/90 px-3 py-2 rounded-lg border border-slate-200 dark:border-primary/20 backdrop-blur-sm shadow-sm z-10">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-primary/20">
            <button
              onClick={() => setActiveTool('pen')}
              className={`w-8 h-8 rounded flex items-center justify-center ${
                activeTool === 'pen'
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`w-8 h-8 rounded flex items-center justify-center ${
                activeTool === 'eraser'
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">ink_eraser</span>
            </button>
            <button className="w-8 h-8 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">gesture</span>
            </button>
          </div>
          <div className="flex gap-2">
            {AVAILABLE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                  activeColor === color ? 'border-primary scale-110 shadow-sm' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
          <button className="px-3 py-1.5 bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> RECORD SESSION
          </button>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />

        <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center pointer-events-none">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Layer: Scratchpad_01</div>
          <div className="text-[10px] font-mono text-slate-400 uppercase">Resolution: 5080 LPI</div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all">
            Step-by-Step Hint
          </button>
          <button className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all">
            Identify Error
          </button>
          <button className="px-4 py-2 bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-primary/20 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all">
            Synthesize Proof
          </button>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">function</span>
            Convert to LaTeX
          </button>
        </div>
      </div>
    </div>
  );
}
