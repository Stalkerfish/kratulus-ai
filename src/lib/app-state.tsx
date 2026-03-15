'use client';

import React, { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  AsyncStatus,
  CanvasSnapshotEvent,
  ConfirmedExpression,
  OcrParseResult,
  OcrRequestLifecycle,
  TutorActionRequest,
  TutorMessage,
  TutorRequestLifecycle,
  TutorRequestPayload,
  TutorResponsePayload,
} from '@/lib/contracts';

export interface AppState {
  canvasSnapshotEvents: CanvasSnapshotEvent[];
  latestOcrParse: OcrParseResult | null;
  ocrStatus: AsyncStatus;
  ocrError?: string;
  ocrActiveRequest?: OcrRequestLifecycle;
  confirmedExpression: ConfirmedExpression | null;
  tutorConversation: TutorMessage[];
  tutorActionRequests: TutorActionRequest[];
  tutorStatus: AsyncStatus;
  tutorError?: string;
  tutorActiveRequest?: TutorRequestLifecycle;
}

type AppAction =
  | { type: 'tutor/studentMessageAppended'; payload: TutorMessage }
  | {
      type: 'tutor/requestStarted';
      payload: {
        requestId: string;
        actionType: TutorActionRequest['type'];
        detail?: string;
      };
    }
  | {
      type: 'tutor/requestSucceeded';
      payload: {
        requestId?: string;
        response: TutorResponsePayload;
      };
    }
  | {
      type: 'tutor/requestFailed';
      payload: {
        requestId?: string;
        error: string;
      };
    }
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
    case 'tutor/studentMessageAppended': {
      return {
        ...state,
        tutorConversation: [...state.tutorConversation, action.payload],
      };
    }
    case 'tutor/requestStarted': {
      const nextRequest: TutorActionRequest = {
        id: action.payload.requestId,
        type: action.payload.actionType,
        status: 'running',
        requestedAt: withNowTime(),
        detail: action.payload.detail,
      };

      return {
        ...state,
        tutorStatus: 'loading',
        tutorError: undefined,
        tutorActionRequests: [...state.tutorActionRequests, nextRequest],
      };
    }
    case 'tutor/requestSucceeded': {
      const updatedRequests = action.payload.requestId
        ? state.tutorActionRequests.map((request) =>
            request.id === action.payload.requestId ? ({ ...request, status: 'completed' } as TutorActionRequest) : request,
          )
        : state.tutorActionRequests;

      return {
        ...state,
        tutorStatus: 'success',
        tutorError: undefined,
        tutorActionRequests: updatedRequests,
        tutorConversation: [...state.tutorConversation, action.payload.response.message],
      };
    }
    case 'tutor/requestFailed': {
      const updatedRequests = action.payload.requestId
        ? state.tutorActionRequests.map((request) =>
            request.id === action.payload.requestId ? ({ ...request, status: 'rejected' } as TutorActionRequest) : request,
          )
        : state.tutorActionRequests;

      return {
        ...state,
        tutorStatus: 'error',
        tutorError: action.payload.error,
        tutorActionRequests: updatedRequests,
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
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function useAppDispatch() {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) {
    throw new Error('useAppDispatch must be used within an AppStateProvider');
  }
  return dispatch;
}
