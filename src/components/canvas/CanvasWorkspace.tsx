'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import type { StoredSession } from '@/lib/sessionStore';
import { downloadSession, saveLatestSession } from '@/lib/sessionStore';

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

const AVAILABLE_COLORS = ['#0f172a', '#f59e0b', '#6d28d9'];

interface CanvasWorkspaceProps {
  initialSession?: StoredSession | null;
}

export default function CanvasWorkspace({ initialSession }: CanvasWorkspaceProps) {
  const { canvasSnapshotEvents, confirmedExpression, latestOcrParse, ocrStatus, ocrError, tutorActionRequests } =
    useAppState();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const replayTimerRef = useRef<number | null>(null);

  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(AVAILABLE_COLORS[0]);
  const [strokes, setStrokes] = useState<StrokeEvent[]>(initialSession?.strokeTimeline ?? []);
  const [recordTimeline, setRecordTimeline] = useState<StrokeEvent[]>(initialSession?.strokeTimeline ?? []);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayProgress, setReplayProgress] = useState(0);

  const activeStrokeIdRef = useRef<string | null>(null);

  const latestSnapshot = canvasSnapshotEvents[canvasSnapshotEvents.length - 1];
  const sessionExpression = confirmedExpression ?? initialSession?.confirmedExpression ?? null;

  useEffect(() => {
    if (!initialSession) {
      return;
    }

    setStrokes(initialSession.strokeTimeline);
    setRecordTimeline(initialSession.strokeTimeline);
  }, [initialSession]);

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

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsReplayActive(false);
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
    const observer = new ResizeObserver(() => resize());
    observer.observe(stage);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [redrawStrokes, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isReplayActive) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const getPointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pressure: event.pressure || 0.5,
        timestamp: Date.now(),
      };
    };

    const finalizeStroke = (pointerId: number) => {
      if (!activeStrokeIdRef.current) {
        return;
      }

      const completedStrokeId = activeStrokeIdRef.current;
      activeStrokeIdRef.current = null;
      canvas.releasePointerCapture(pointerId);

      setStrokes((prev) => {
        const now = Date.now();
        const updated = prev.map((stroke) =>
          stroke.id === completedStrokeId ? { ...stroke, endedAt: now, updatedAt: now } : stroke,
        );

        if (isRecording) {
          const completed = updated.find((stroke) => stroke.id === completedStrokeId);
          if (completed) {
            setRecordTimeline((timeline) => [...timeline, completed]);
          }
        }

        return updated;
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = getPointerPosition(event);
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
      setStrokes((prev) => {
        const updated = [...prev, newStroke];
        redrawStrokes(context, updated);
        return updated;
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeStrokeIdRef.current) {
        return;
      }

      const point = getPointerPosition(event);
      const activeStrokeId = activeStrokeIdRef.current;

      setStrokes((prev) => {
        const now = Date.now();
        const updated = prev.map((stroke) =>
          stroke.id === activeStrokeId ? { ...stroke, points: [...stroke.points, point], updatedAt: now } : stroke,
        );
        redrawStrokes(context, updated);
        return updated;
      });
    };

    const handlePointerUp = (event: PointerEvent) => finalizeStroke(event.pointerId);
    const handlePointerCancel = (event: PointerEvent) => finalizeStroke(event.pointerId);

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
  }, [activeColor, activeTool, isRecording, isReplayActive, redrawStrokes]);

  useEffect(() => {
    const sourceExpression = confirmedExpression ?? initialSession?.confirmedExpression ?? null;
    const sourceActions = tutorActionRequests.length > 0 ? tutorActionRequests : initialSession?.tutorActionHistory ?? [];

    const session: StoredSession = {
      id: initialSession?.id ?? 'latest',
      createdAt: initialSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      strokeTimeline: recordTimeline,
      confirmedExpression: sourceExpression,
      tutorActionHistory: sourceActions,
    };

    saveLatestSession(session);
  }, [confirmedExpression, initialSession, recordTimeline, tutorActionRequests]);

  useEffect(
    () => () => {
      if (replayTimerRef.current) {
        window.clearTimeout(replayTimerRef.current);
      }
    },
    [],
  );

  const handleReplay = useCallback(() => {
    if (recordTimeline.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    stopReplay();
    setIsReplayActive(true);
    setReplayProgress(0);

    const sortedTimeline = [...recordTimeline].sort((a, b) => a.startedAt - b.startedAt);

    const runStep = (index: number) => {
      if (index >= sortedTimeline.length) {
        redrawStrokes(context, sortedTimeline);
        setReplayProgress(100);
        setIsReplayActive(false);
        return;
      }

      const visible = sortedTimeline.slice(0, index + 1);
      redrawStrokes(context, visible);
      setReplayProgress(((index + 1) / sortedTimeline.length) * 100);

      const current = sortedTimeline[index];
      const next = sortedTimeline[index + 1];
      const gap = next ? Math.max(40, (next.startedAt - current.startedAt) / replaySpeed) : 250;

      replayTimerRef.current = window.setTimeout(() => runStep(index + 1), gap);
    };

    runStep(0);
  }, [recordTimeline, redrawStrokes, replaySpeed, stopReplay]);

  const handleExport = useCallback(() => {
    const sourceExpression = confirmedExpression ?? initialSession?.confirmedExpression ?? null;
    const sourceActions = tutorActionRequests.length > 0 ? tutorActionRequests : initialSession?.tutorActionHistory ?? [];

    downloadSession({
      id: initialSession?.id ?? 'latest',
      createdAt: initialSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      strokeTimeline: recordTimeline,
      confirmedExpression: sourceExpression,
      tutorActionHistory: sourceActions,
    });
  }, [confirmedExpression, initialSession, recordTimeline, tutorActionRequests]);

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
                activeTool === 'pen' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10'
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
          <button
            onClick={() => setIsRecording((value) => !value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-slate-400'}`} />
            {isRecording ? 'RECORDING' : 'RECORD OFF'}
          </button>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />

        <div className="absolute inset-0 p-20 flex flex-col items-center justify-center opacity-80 pointer-events-none">
          <div className="max-w-md space-y-8">
            <div className="text-4xl font-display text-slate-800 dark:text-slate-200 italic opacity-60">
              {latestSnapshot?.label ?? 'Waiting for canvas input...'}
            </div>
            <div className="text-3xl font-display text-primary italic border-l-4 border-primary/40 pl-6 py-2">
              {sessionExpression?.latex ?? 'No confirmed expression yet'}
            </div>
            <div className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 tracking-widest">
              OCR {ocrStatus}
              {latestOcrParse ? ` • Confidence ${(latestOcrParse.confidence * 100).toFixed(1)}%` : ''}
              {ocrError ? ` • ${ocrError}` : ''}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center pointer-events-none">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Last snapshot: {latestSnapshot?.id ?? 'none'}</div>
          <div className="text-[10px] font-mono text-slate-400 uppercase">Snapshots: {canvasSnapshotEvents.length}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all">
            Step-by-Step Hint
          </button>
          <button className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all">
            Identify Error
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsRecording((value) => !value)}
            className="px-4 py-2 bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-primary/20 rounded-lg text-sm font-bold"
          >
            {isRecording ? 'Stop Recording' : 'Record'}
          </button>
          <button
            onClick={handleReplay}
            className="px-4 py-2 bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-primary/20 rounded-lg text-sm font-bold"
          >
            Replay
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl flex items-center gap-3">
        <label htmlFor="replay-speed" className="text-xs font-mono uppercase text-slate-500">
          Replay speed
        </label>
        <select
          id="replay-speed"
          value={replaySpeed}
          onChange={(event) => setReplaySpeed(Number(event.target.value))}
          className="px-2 py-1 border border-slate-200 dark:border-primary/20 rounded bg-transparent"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
        <div className="text-xs font-mono uppercase text-slate-500">Progress {replayProgress.toFixed(0)}%</div>
        {isReplayActive ? (
          <button
            onClick={stopReplay}
            className="ml-auto px-3 py-1 border border-slate-200 dark:border-primary/20 rounded text-xs font-bold"
          >
            Stop Replay
          </button>
        ) : null}
        <div className="text-xs font-mono uppercase text-slate-400 ml-auto">Recorded strokes {recordTimeline.length}</div>
      </div>
    </div>
  );
}
