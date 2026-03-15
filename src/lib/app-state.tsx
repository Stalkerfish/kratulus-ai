'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type {
  AsyncStatus,
  CanvasSnapshotEvent,
  ConfirmedExpression,
  OcrParseResult,
  TutorActionRequest,
  TutorMessage,
} from '@/lib/contracts';

interface AppState {
  canvasSnapshotEvents: CanvasSnapshotEvent[];
  latestOcrParse: OcrParseResult | null;
  ocrStatus: AsyncStatus;
  ocrError?: string;
  confirmedExpression: ConfirmedExpression | null;
  tutorConversation: TutorMessage[];
  tutorActionRequests: TutorActionRequest[];
  tutorStatus: AsyncStatus;
  tutorError?: string;
}

const initialState: AppState = {
  canvasSnapshotEvents: [
    {
      id: 'snap_001',
      timestamp: '14:02:11',
      label: 'Input detected',
      strokeCount: 42,
      status: 'captured',
    },
    {
      id: 'snap_002',
      timestamp: '14:02:15',
      label: 'Chain rule branch isolated',
      strokeCount: 57,
      status: 'processing',
    },
    {
      id: 'snap_003',
      timestamp: '14:02:18',
      label: 'Derivative parse stabilized',
      strokeCount: 64,
      status: 'parsed',
    },
  ],
  latestOcrParse: {
    latex: "f'(x) = 2x\\cos(x^2) + 3",
    plainText: "f prime of x equals 2x cosine of x squared plus 3",
    confidence: 0.982,
    sourceSnapshotId: 'snap_003',
    updatedAt: '14:02:18',
  },
  ocrStatus: 'success',
  confirmedExpression: {
    latex: "f'(x) = 2x\\cos(x^2) + 3",
    confirmedAt: '14:02:22',
    note: 'Confirmed after OCR confidence exceeded threshold.',
  },
  tutorConversation: [
    {
      id: 'msg_001',
      role: 'tutor',
      content:
        'Correct application of the Chain Rule. You identified u = x² and du/dx = 2x.',
      createdAt: '14:02:30',
    },
    {
      id: 'msg_002',
      role: 'tutor',
      content: 'Try evaluating the derivative at x = √π to find the slope of the tangent line.',
      createdAt: '14:02:33',
    },
  ],
  tutorActionRequests: [
    {
      id: 'act_001',
      type: 'step_hint',
      status: 'completed',
      requestedAt: '14:02:28',
      detail: 'Show guidance for derivative evaluation at a point.',
    },
    {
      id: 'act_002',
      type: 'evaluate_point',
      status: 'running',
      requestedAt: '14:02:34',
      detail: 'Compute f\'(√π).',
    },
  ],
  tutorStatus: 'loading',
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const state = useMemo(() => initialState, []);
  return <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return state;
}
