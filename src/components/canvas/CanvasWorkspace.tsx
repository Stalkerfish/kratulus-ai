'use client';

import React from 'react';
import { useAppState } from '@/lib/app-state';

export default function CanvasWorkspace() {
  const { canvasSnapshotEvents, confirmedExpression, latestOcrParse, ocrStatus, ocrError } = useAppState();

  const latestSnapshot = canvasSnapshotEvents[canvasSnapshotEvents.length - 1];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-grow bg-white dark:bg-[#1a110b] border border-slate-200 dark:border-primary/20 rounded-xl shadow-inner canvas-grid relative overflow-hidden">
        <div className="absolute top-4 left-6 flex items-center gap-4 bg-white/90 dark:bg-background-dark/90 px-3 py-2 rounded-lg border border-slate-200 dark:border-primary/20 backdrop-blur-sm shadow-sm z-10">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-primary/20">
            <button className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button className="w-8 h-8 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">ink_eraser</span>
            </button>
            <button className="w-8 h-8 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">gesture</span>
            </button>
          </div>
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white cursor-pointer" />
            <div className="w-6 h-6 rounded-full bg-primary border-2 border-white cursor-pointer shadow-sm" />
            <div className="w-6 h-6 rounded-full bg-secondary border-2 border-white cursor-pointer" />
          </div>
        </div>

        <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
          <button className="px-3 py-1.5 bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" /> RECORD SESSION
          </button>
        </div>

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
