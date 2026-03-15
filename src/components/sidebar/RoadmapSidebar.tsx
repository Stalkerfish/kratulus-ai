import React from 'react';

export default function RoadmapSidebar() {
  return (
    <aside className="col-span-12 lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-2">
      <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl p-4">
        <div className="mb-4">
          <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-tighter">Current Module</span>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Ch 3: Derivatives</h3>
          <div className="w-full bg-slate-100 dark:bg-primary/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full w-[65%]" style={{ boxShadow: '0 0 8px #ec5b13aa' }}></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">65% Progress Complete</p>
        </div>
        <nav className="flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary group cursor-pointer">
            <span className="material-symbols-outlined text-[20px] fill-1">insights</span>
            <span className="text-sm font-semibold">The Derivative</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            <span className="text-sm font-medium">Rules</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            <span className="text-sm font-medium">Chain Rule</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">texture</span>
            <span className="text-sm font-medium">Implicit Diff.</span>
          </div>
        </nav>
        <button className="w-full mt-6 py-2 px-4 bg-slate-900 dark:bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">map</span>
          VIEW FULL ROADMAP
        </button>
      </div>

      <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl p-4 flex-grow relative overflow-hidden">
        <span className="text-[10px] font-mono text-secondary uppercase font-bold mb-2 block">Tangent Analysis</span>
        <div className="relative h-48 w-full border border-slate-100 dark:border-primary/10 rounded-lg overflow-hidden bg-slate-50 dark:bg-black/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full opacity-40 dark:opacity-20" viewBox="0 0 100 100">
              <path d="M 10 80 Q 50 10 90 40" fill="none" stroke="#ec5b13" strokeWidth="2"></path>
              <line stroke="#0ea5e9" strokeWidth="1" x1="30" x2="70" y1="20" y2="60"></line>
            </svg>
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400">f'(x) = 2x + cos(x)</div>
        </div>
      </div>
    </aside>
  );
}
