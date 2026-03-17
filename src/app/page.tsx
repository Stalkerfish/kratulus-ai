'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/layout/Shell';
import RoadmapSidebar from '@/components/sidebar/RoadmapSidebar';
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace';
import OcrStreamPanel from '@/components/panels/OcrStreamPanel';
import TutorPanel from '@/components/panels/TutorPanel';
import { AppStateProvider } from '@/lib/app-state';
import { loadLatestSession, type StoredSession } from '@/lib/sessionStore';

export default function Home() {
  const [initialSession, setInitialSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const session = loadLatestSession();
    if (session) {
      // Use a timeout to move setState out of the synchronous effect body to satisfy strict linting
      setTimeout(() => setInitialSession(session), 0);
    }
  }, []);

  return (
    <AppStateProvider>
      <Shell>
        <RoadmapSidebar />
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <CanvasWorkspace initialSession={initialSession} />
        </section>
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
          <OcrStreamPanel />
          <TutorPanel />
        </aside>
      </Shell>
    </AppStateProvider>
  );
}
