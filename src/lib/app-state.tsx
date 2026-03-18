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
  | { type: 'tutor/requestFailed'; payload: { requestId?: string; error: string } }
  | { type: 'ocr/requestStarted'; payload: { requestId: string; snapshotId: string; strokeCount: number } }
  | { type: 'ocr/requestSucceeded'; payload: { requestId: string; parse: OcrParseResult } }
  | { type: 'ocr/requestFailed'; payload: { requestId: string; error: string } }
  | { type: 'ocr/confirmedExpressionSet'; payload: ConfirmedExpression };

interface AppStateContextValue extends AppState {
  dispatch: React.Dispatch<AppAction>;
  invokeTutor: (payload: TutorRequestPayload) => Promise<TutorResponsePayload>;
}

const initialState: AppState = {
  canvasSnapshotEvents: [],
  latestOcrParse: null,
  ocrStatus: 'idle',
  confirmedExpression: null,
  tutorConversation: [],
  tutorActionRequests: [],
  tutorStatus: 'idle',
};

function nowTimeLabel() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function tutorActionCopy(type: TutorActionRequest['type']) {
  switch (type) {
    case 'step_hint':
      return 'Break the expression into nested functions and differentiate from the outside in.';
    case 'identify_error':
      return 'Common error: forgetting to multiply by the derivative of the inner function.';
    case 'synthesize_proof':
      return 'A concise proof can proceed by defining helper substitutions and applying known differentiation rules.';
    case 'evaluate_point':
      return 'Substitute the target x-value after simplification to reduce arithmetic mistakes.';
    default:
      return 'I can help with the next step.';
  }
}

async function invokeTutorClient(payload: TutorRequestPayload): Promise<TutorResponsePayload> {
  const response = await fetch('/api/tutor/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Tutor request failed (${response.status})`);
  }

  return response.json();
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
        requestedAt: nowTimeLabel(),
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
        ? state.tutorActionRequests.map((request): TutorActionRequest =>
            request.id === action.payload.requestId ? { ...request, status: 'completed' } : request,
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
        ? state.tutorActionRequests.map((request): TutorActionRequest =>
            request.id === action.payload.requestId ? { ...request, status: 'rejected' } : request,
          )
        : state.tutorActionRequests;

      return {
        ...state,
        tutorStatus: 'error',
        tutorError: action.payload.error,
        tutorActionRequests: updatedRequests,
      };
    }
    case 'ocr/requestStarted': {
      const newSnapshot: CanvasSnapshotEvent = {
        id: action.payload.snapshotId,
        timestamp: nowTimeLabel(),
        label: 'Analyzing strokes...',
        strokeCount: action.payload.strokeCount,
        status: 'processing',
      };
      return {
        ...state,
        ocrStatus: 'loading',
        ocrError: undefined,
        ocrActiveRequest: { requestId: action.payload.requestId, snapshotId: action.payload.snapshotId },
        canvasSnapshotEvents: [...state.canvasSnapshotEvents, newSnapshot],
      };
    }
    case 'ocr/requestSucceeded': {
      return {
        ...state,
        ocrStatus: 'success',
        latestOcrParse: action.payload.parse,
        canvasSnapshotEvents: state.canvasSnapshotEvents.map((ev) =>
          ev.id === action.payload.parse.sourceSnapshotId ? { ...ev, status: 'parsed', label: 'OCR success' } : ev,
        ),
      };
    }
    case 'ocr/requestFailed': {
      return {
        ...state,
        ocrStatus: 'error',
        ocrError: action.payload.error,
      };
    }
    case 'ocr/confirmedExpressionSet': {
      return {
        ...state,
        confirmedExpression: action.payload,
      };
    }
    default:
      return state;
  }
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      dispatch,
      invokeTutor: invokeTutorClient,
    }),
    [state],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}



export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
