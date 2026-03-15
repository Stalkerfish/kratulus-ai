import React from 'react';

export default function TutorPanel() {
  return (
    <div className="bg-white dark:bg-background-dark border border-primary/30 rounded-xl p-5 flex-grow flex flex-col relative overflow-hidden blueprint-grid">
      <div className="absolute top-0 right-0 p-2">
        <span className="material-symbols-outlined text-primary/20 text-6xl rotate-12">robot_2</span>
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined font-variation-FILL-1">psychology</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white leading-none">The Analyst</h4>
            <span className="text-[10px] font-mono text-primary uppercase leading-none">Active Analysis</span>
          </div>
        </div>
        <div className="space-y-4 flex-grow">
          <div className="bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 p-3 rounded-lg">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Step-by-Step Guidance:</p>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">
              {"\"Correct application of the Chain Rule. You correctly identified $u = x^2$ and $du/dx = 2x$. Now, try evaluating the derivative at $x = \\sqrt{\\pi}$ to find the slope of the tangent line.\""}
            </p>
          </div>
          <div className="border-l-2 border-secondary/50 pl-4 py-1">
            <p className="text-[10px] font-mono text-secondary uppercase font-bold tracking-tighter">Next Recommended Step</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Practice Second Derivatives: $f''(x)$</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-100 dark:bg-primary/10 p-2 rounded border border-slate-200 dark:border-primary/10 text-center">
              <span className="text-[10px] text-slate-500 block uppercase tracking-tighter">Accuracy</span>
              <span className="text-lg font-bold text-primary font-mono">98.2%</span>
            </div>
            <div className="bg-slate-100 dark:bg-primary/10 p-2 rounded border border-slate-200 dark:border-primary/10 text-center">
              <span className="text-[10px] text-slate-500 block uppercase tracking-tighter">Focus Rate</span>
              <span className="text-lg font-bold text-secondary font-mono">High</span>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-primary/10">
          <div className="relative">
            <input 
              className="w-full bg-slate-100 dark:bg-primary/10 border-none rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none" 
              placeholder="Ask The Analyst..." 
              type="text" 
            />
            <button className="absolute right-2 top-1.5 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
