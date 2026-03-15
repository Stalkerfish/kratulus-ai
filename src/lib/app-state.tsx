'use client';

import React, { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
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

type AppAction =
  | { type: 'ocr/cycleStarted'; payload: { snapshot: CanvasSnapshotEvent } }
  | { type: 'ocr/cycleSucceeded'; payload: { parse: OcrParseResult } }
  | { type: 'ocr/cycleFailed'; payload: { error: string } }
  | { type: 'ocr/confirmedExpressionSet'; payload: { latex: string; note?: string } };

const initialState: AppState = {
  canvasSnapshotEvents: [
    {
      id: 'snap_001',
      timestamp: '14:02:11',
      label: 'Input detected',
      strokeCount: 42,
      status: 'captured',
    },
  ],
  latestOcrParse: null,
  ocrStatus: 'idle',
  confirmedExpression: null,
  tutorConversation: [
    {
      id: 'msg_001',
      role: 'tutor',
      content: 'Correct application of the Chain Rule. You identified u = x² and du/dx = 2x.',
      createdAt: '14:02:30',
    },
  ],
  tutorActionRequests: [],
  tutorStatus: 'idle',
};

function withNowTime() {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ocr/cycleStarted': {
      return {
        ...state,
        ocrStatus: 'loading',
        ocrError: undefined,
        canvasSnapshotEvents: [...state.canvasSnapshotEvents, action.payload.snapshot],
      };
    }
    case 'ocr/cycleSucceeded': {
      return {
        ...state,
        ocrStatus: 'success',
        ocrError: undefined,
        latestOcrParse: action.payload.parse,
        canvasSnapshotEvents: state.canvasSnapshotEvents.map((event) =>
          event.id === action.payload.parse.sourceSnapshotId
            ? { ...event, status: 'parsed', label: 'OCR parse received' }
            : event,
        ),
      };
    }
    case 'ocr/cycleFailed': {
      return {
        ...state,
        ocrStatus: 'error',
        ocrError: action.payload.error,
      };
    }
    case 'ocr/confirmedExpressionSet': {
      return {
        ...state,
        confirmedExpression: {
          latex: action.payload.latex,
          note: action.payload.note,
          confirmedAt: withNowTime(),
        },
      };
    }
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stableState = useMemo(() => state, [state]);

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppStateContext.Provider value={stableState}>{children}</AppStateContext.Provider>
    </AppDispatchContext.Provider>
  );
}

export function useAppState() {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return state;
}

export function useAppDispatch() {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) {
    throw new Error('useAppDispatch must be used within an AppStateProvider');
  }
  return dispatch;
}
