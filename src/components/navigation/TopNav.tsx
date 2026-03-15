import React from 'react';

export default function TopNav() {
  return (
    <header className="border-b border-slate-200 dark:border-primary/20 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-white text-2xl">query_stats</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-none tracking-tight">
                Calculus Lab</h2>
              <span className="text-[10px] font-mono text-primary uppercase tracking-widest leading-none">The Analyst AI v2.4</span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-6">
            <a className="text-primary text-sm font-semibold border-b-2 border-primary pb-1" href="#">Lab</a>
            <a className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">Library</a>
            <a className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">Simulations</a>
            <a className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">Settings</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-primary/10 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-primary/20">
            <span className="material-symbols-outlined text-slate-400 text-sm">tablet_mac</span>
            <span className="text-xs font-mono ml-2 text-slate-600 dark:text-slate-300">Deco Mini 7: <span className="text-green-500">Connected</span></span>
          </div>
          <div className="flex gap-2 border-l border-slate-200 dark:border-primary/20 pl-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/20 rounded-xl transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-10 w-10 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden">
              <img className="rounded-full w-full h-full object-cover" data-alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuALdgktelDAIz0Y52f84EiEQ3jm2CYknlHvwCOtd4YtJGZOoJjK3LX3QjYfHOjQ90k4ff2vlNfI91LjVYmppqxLtSFejWah1BR_qvEpGQXEpxnclgvTchDSq34L-rP31XeRZ4MnC3PxV5ln1KS-J0r7WIsb9OhCr53Xck7e2MOXsX_4Noxm9SLRqoj1TBIysLLxsCqceT_mYB6ykPg_voz3qCOYsO_44XedMUeH8wITLzVQMbNHeRUJ9kgHoQteQEAD679ZTndd5hg" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
