import React from 'react';
import TopNav from '../navigation/TopNav';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <TopNav />
      <main className="max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-12 gap-6 flex-grow h-[calc(100vh-80px)]">
        {children}
      </main>
      <footer className="max-w-[1600px] w-full mx-auto px-6 py-2 flex items-center justify-between opacity-50 overflow-hidden">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 whitespace-nowrap">
          System: Stable | Latency: 12ms | Memory: 4.2GB / 16GB
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 whitespace-nowrap">
          © 2024 Blueprint Technical Lab | Analyst Engine 4.0
        </div>
      </footer>
    </div>
  );
}
