'use client';

import React from 'react';
import { useAppState } from '@/lib/app-state';

const statusColor = {
  captured: 'text-slate-300',
  processing: 'text-yellow-300',
  parsed: 'text-primary font-bold',
};

export default function OcrStreamPanel() {
  const { canvasSnapshotEvents, latestOcrParse, ocrStatus, ocrError } = useAppState();

  return (
    <div className="bg-slate-900 dark:bg-black border border-slate-700 rounded-xl p-4 min-h-[12rem] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-secondary font-bold tracking-widest leading-none">OCR REAL-TIME STREAM</span>
        <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#0ea5e9]" />
      </div>
      <div className="bg-black/50 border border-secondary/20 rounded-lg p-3 flex-grow font-mono text-xs text-secondary/80 overflow-y-auto leading-relaxed">
        {ocrStatus === 'loading' && <div className="text-secondary">Waiting for OCR parse...</div>}
        {ocrStatus === 'error' && <div className="text-red-300">OCR error: {ocrError ?? 'Unknown error'}</div>}

        {canvasSnapshotEvents.map((event) => (
          <div className="flex gap-2 mb-2" key={event.id}>
            <span className="text-secondary/40 whitespace-nowrap">{event.timestamp}</span>
            <span className={statusColor[event.status]}>
              {`Snapshot ${event.id}: ${event.label} (${event.strokeCount} strokes)`}
            </span>
          </div>
        ))}

        {latestOcrParse && (
          <div className="flex gap-2 mb-2 border-t border-secondary/20 mt-3 pt-3">
            <span className="text-secondary/40 whitespace-nowrap">{latestOcrParse.updatedAt}</span>
            <span className="text-white">
              {`Parsed: ${latestOcrParse.latex} | confidence ${(latestOcrParse.confidence * 100).toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
