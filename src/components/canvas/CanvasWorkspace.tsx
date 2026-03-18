'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import type { OcrRequestPayload, StrokeEvent, CanvasTool } from '@/lib/contracts';
import { requestOcrParse } from '@/lib/ocrClient';
import { type StoredSession, saveLatestSession } from '@/lib/sessionStore';
const AVAILABLE_COLORS = ['#0f172a', '#f59e0b', '#6d28d9'];
const REPLAY_SPEED_STORAGE_KEY = 'kratulus.replaySpeed';

interface CanvasWorkspaceProps {
  initialSession?: StoredSession | null;
}

export default function CanvasWorkspace({ initialSession }: CanvasWorkspaceProps) {
  const {
    canvasSnapshotEvents,
    confirmedExpression,
    latestOcrParse,
    ocrStatus,
    ocrError,
    tutorActionRequests,
    tutorConversation,
    dispatch,
    invokeTutor,
  } = useAppState();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const replayTimerRef = useRef<number | null>(null);

  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(AVAILABLE_COLORS[0]);
  const [strokes, setStrokes] = useState<StrokeEvent[]>(initialSession?.strokeTimeline ?? []);
  const [recordTimeline, setRecordTimeline] = useState<StrokeEvent[]>(initialSession?.strokeTimeline ?? []);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(initialSession?.replaySpeed ?? 1);
  const [replayProgress, setReplayProgress] = useState(0);
  const [preferredEngine, setPreferredEngine] = useState<OcrRequestPayload['inkModel']>('pix2text');

  const activeStrokeIdRef = useRef<string | null>(null);
  const snapshotTimerRef = useRef<number | null>(null);
  const lastScheduledStrokeCountRef = useRef<number>(0);
  const lastScheduledUpdatedAtRef = useRef<number>(0);

  const latestSnapshot = canvasSnapshotEvents[canvasSnapshotEvents.length - 1];
  const sessionExpression = confirmedExpression ?? initialSession?.confirmedExpression ?? null;

  const scheduleSnapshot = useCallback(
    (trigger: OcrRequestPayload['trigger'], delayMs: number) => {
      if (snapshotTimerRef.current) {
        window.clearTimeout(snapshotTimerRef.current);
      }

      snapshotTimerRef.current = window.setTimeout(async () => {
        const latestStroke = strokes[strokes.length - 1];
        const latestStrokeAt = latestStroke?.updatedAt ?? null;

        if (
          lastScheduledStrokeCountRef.current === strokes.length &&
          lastScheduledUpdatedAtRef.current === (latestStrokeAt ?? 0)
        ) {
          return;
        }

        lastScheduledStrokeCountRef.current = strokes.length;
        lastScheduledUpdatedAtRef.current = latestStrokeAt ?? 0;

        const stageBounds = stageRef.current?.getBoundingClientRect();
        const payload: OcrRequestPayload = {
          snapshotId: `snap_${crypto.randomUUID()}`,
          strokeCount: strokes.length,
          strokes,
          inkModel: preferredEngine,
          canvasMeta: {
            width: Math.round(stageBounds?.width ?? 0),
            height: Math.round(stageBounds?.height ?? 0),
            xDPI: window.devicePixelRatio * 96,
            yDPI: window.devicePixelRatio * 96,
          },
          sessionId: initialSession?.id ?? 'live-session',
          latestStrokeAt,
          trigger,
        };

        const requestId = `ocr_${crypto.randomUUID()}`;
        dispatch({
          type: 'ocr/requestStarted',
          payload: { requestId, snapshotId: payload.snapshotId, strokeCount: payload.strokeCount },
        });

        try {
          const parse = await requestOcrParse(payload);
          dispatch({
            type: 'ocr/requestSucceeded',
            payload: { requestId, parse },
          });
        } catch (error) {
          dispatch({
            type: 'ocr/requestFailed',
            payload: {
              requestId,
              error: error instanceof Error ? error.message : 'OCR conversion failed',
            },
          });
        }
        // Increasing delay to reduce quota usage
      }, trigger === 'stroke-complete' ? 3000 : 5000);
    },
    [dispatch, initialSession?.id, strokes],
  );

  const appendTutorFeedback = useCallback(
    async (type: 'step_hint' | 'identify_error' | 'synthesize_proof' | 'evaluate_point', detail: string) => {
      if (!sessionExpression?.latex) {
        dispatch({
          type: 'tutor/requestFailed',
          payload: {
            error: 'Confirm an expression before requesting tutor guidance.',
          },
        });
        return;
      }

      const requestId = `act_${crypto.randomUUID()}`;
      dispatch({ type: 'tutor/requestStarted', payload: { requestId, actionType: type, detail } });

      try {
        const response = await invokeTutor({
          confirmedExpressionLatex: sessionExpression.latex,
          conversation: tutorConversation,
          requestedAction: type,
        });

        dispatch({ type: 'tutor/requestSucceeded', payload: { requestId, response } });
      } catch (error) {
        dispatch({
          type: 'tutor/requestFailed',
          payload: {
            requestId,
            error: error instanceof Error ? error.message : 'Tutor request failed.',
          },
        });
      }
    },
    [dispatch, invokeTutor, sessionExpression, tutorConversation],
  );

  useEffect(() => {
    if (!initialSession) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStrokes(initialSession.strokeTimeline);
    setRecordTimeline(initialSession.strokeTimeline);
  }, [initialSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedSpeed = Number(window.localStorage.getItem(REPLAY_SPEED_STORAGE_KEY));
    const nextSpeed = Number.isFinite(savedSpeed) && savedSpeed > 0 ? savedSpeed : initialSession?.replaySpeed ?? 1;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReplaySpeed((current) => (current === nextSpeed ? current : nextSpeed));
  }, [initialSession?.replaySpeed]);

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

      scheduleSnapshot('stroke-complete', 800);
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

      // REMOVED: inactive triggers during pointermove to save quota
    };

    const handlePointerUp = (event: PointerEvent) => finalizeStroke(event.pointerId);
    const handlePointerCancel = (event: PointerEvent) => finalizeStroke(event.pointerId);

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
  }, [activeColor, activeTool, isRecording, isReplayActive, redrawStrokes, scheduleSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(REPLAY_SPEED_STORAGE_KEY, String(replaySpeed));
  }, [replaySpeed]);

  useEffect(
    () => () => {
      if (replayTimerRef.current) {
        window.clearTimeout(replayTimerRef.current);
      }
      if (snapshotTimerRef.current) {
        window.clearTimeout(snapshotTimerRef.current);
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

  const toggleRecording = useCallback(() => {
    if (!isRecording) {
      setRecordTimeline([]);
      setIsRecording(true);
      return;
    }

    setIsRecording(false);
    const sourceExpression = confirmedExpression ?? initialSession?.confirmedExpression ?? null;
    const sourceActions = tutorActionRequests.length > 0 ? tutorActionRequests : initialSession?.tutorActionHistory ?? [];

    const session: StoredSession = {
      id: initialSession?.id ?? 'latest',
      createdAt: initialSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      strokeTimeline: recordTimeline,
      confirmedExpression: sourceExpression,
      tutorActionHistory: sourceActions,
      replaySpeed,
    };

    saveLatestSession(session);
  }, [confirmedExpression, initialSession, isRecording, recordTimeline, replaySpeed, tutorActionRequests]);

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
          <div className="flex items-center gap-1 ml-2 pl-4 border-l border-slate-200 dark:border-primary/20">
            <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">Engine</span>
            <button
              type="button"
              onClick={() => setPreferredEngine('pix2text')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${preferredEngine === 'pix2text' ? 'bg-secondary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5'}`}
            >
              LOCAL
            </button>
            <button
              type="button"
              onClick={() => setPreferredEngine('myscript')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${preferredEngine === 'myscript' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5'}`}
            >
              CLOUD
            </button>
          </div>
        </div>

        <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={toggleRecording}
            className="px-3 py-1.5 bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-slate-400'}`} />
            <span>{isRecording ? 'STOP RECORDING' : 'RECORD SESSION'}</span>
          </button>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />

        <div className="absolute bottom-20 left-10 pointer-events-none transition-all duration-300">
          <div className="max-w-xs space-y-4">
            <div className="text-xl font-display text-slate-400 dark:text-slate-500 italic opacity-60">
              {latestSnapshot?.label ?? 'Drafting...'}
            </div>
            <div className="text-lg font-display text-primary italic border-l-2 border-primary/40 pl-4 py-1">
              {sessionExpression?.latex ?? 'No confirmed expression'}
            </div>
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-600 tracking-widest">
              OCR {ocrStatus}
              {latestOcrParse ? ` • Confidence ${(latestOcrParse.confidence * 100).toFixed(1)}%` : ''}
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
          <button
            type="button"
            onClick={() => appendTutorFeedback('step_hint', 'Requesting step-by-step hint from workspace controls.')}
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Step-by-Step Hint
          </button>
          <button
            type="button"
            onClick={() => appendTutorFeedback('identify_error', 'Requesting error analysis for current work.')}
            className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Identify Error
          </button>
          <button
            type="button"
            onClick={() => appendTutorFeedback('synthesize_proof', 'Requesting proof synthesis from current expression.')}
            className="px-4 py-2 bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-primary/20 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Synthesize Proof
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => appendTutorFeedback('evaluate_point', 'Convert expression to a tutor evaluation aid.')}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <span className="material-symbols-outlined text-sm">function</span>
            <span>Convert to LaTeX</span>
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
            type="button"
            onClick={stopReplay}
            className="ml-auto px-3 py-1 border border-slate-200 dark:border-primary/20 rounded text-xs font-bold"
          >
            Stop Replay
          </button>
        ) : recordTimeline.length > 0 ? (
          <button
            type="button"
            onClick={handleReplay}
            className="ml-auto px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Play Replay
          </button>
        ) : null}
        <div className="text-xs font-mono uppercase text-slate-400 ml-auto">Recorded strokes {recordTimeline.length}</div>
      </div>
    </div>
  );
}
