import type { ConfirmedExpression, TutorActionRequest } from '@/lib/contracts';
import type { StrokeEvent } from '@/components/canvas/CanvasWorkspace';

export interface StoredSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  strokeTimeline: StrokeEvent[];
  confirmedExpression: ConfirmedExpression | null;
  tutorActionHistory: TutorActionRequest[];
  replaySpeed?: number;
}

const STORAGE_KEY = 'kratulus.latestSession';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadLatestSession(): StoredSession | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveLatestSession(session: StoredSession) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function createSessionExportBlob(session: StoredSession) {
  const payload = JSON.stringify(session, null, 2);
  return new Blob([payload], { type: 'application/json' });
}

export function downloadSession(session: StoredSession) {
  if (!isBrowser()) {
    return;
  }

  const blob = createSessionExportBlob(session);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date(session.updatedAt).toISOString().replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `kratulus-session-${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
