import React from 'react';

export default function OcrStreamPanel() {
  return (
    <div className="bg-slate-900 dark:bg-black border border-slate-700 rounded-xl p-4 min-h-[12rem] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-secondary font-bold tracking-widest leading-none">OCR REAL-TIME STREAM</span>
        <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#0ea5e9]"></span>
      </div>
      <div className="bg-black/50 border border-secondary/20 rounded-lg p-3 flex-grow font-mono text-xs text-secondary/80 overflow-y-auto leading-relaxed">
        <div className="flex gap-2 mb-2">
          <span className="text-secondary/40 whitespace-nowrap">14:02:11</span>
          <span className="text-white">{"\\text{Input detected: } f(x) = \\sin(x^2) + 3x"}</span>
        </div>
        <div className="flex gap-2 mb-2">
          <span className="text-secondary/40 whitespace-nowrap">14:02:15</span>
          <span className="text-white">{"\\text{Processing Chain Rule...}"}</span>
        </div>
        <div className="flex gap-2 mb-2">
          <span className="text-secondary/40 whitespace-nowrap">14:02:18</span>
          <span className="text-primary font-bold">{"\\text{Parsed: } f'(x) = 2x\\cos(x^2) + 3"}</span>
        </div>
      </div>
    </div>
  );
}
