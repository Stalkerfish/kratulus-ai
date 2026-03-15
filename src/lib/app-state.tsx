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

export type AppStateAction =
  | { type: 'canvas/snapshotCreated'; payload: CanvasSnapshotEvent }
  | { type: 'ocr/requestStarted'; payload: OcrRequestLifecycle }
  | { type: 'ocr/requestSucceeded'; payload: { requestId: string; parse: OcrParseResult } }
  | { type: 'ocr/requestFailed'; payload: { requestId: string; error: string } }
  | { type: 'ocr/confirmedExpressionSet'; payload: ConfirmedExpression | null }
  | { type: 'tutor/requestStarted'; payload: { requestId: string; actionRequest: TutorActionRequest } }
  | {
      type: 'tutor/requestSucceeded';
      payload: { requestId: string; message: TutorMessage; actionRequest?: TutorActionRequest };
    }
  | { type: 'tutor/requestFailed'; payload: { requestId: string; error: string } }
  | { type: 'tutor/messageAppended'; payload: TutorMessage };

const seededInitialState: AppState = {
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
    plainText: 'f prime of x equals 2x cosine of x squared plus 3',
    confidence: 0.982,
    sourceSnapshotId: 'snap_003',
    updatedAt: '14:02:18',
  },
  ocrStatus: 'success',
  ocrActiveRequest: { requestId: 'ocr_req_001', snapshotId: 'snap_003' },
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
      detail: "Compute f'(√π).",
    },
  ],
  tutorStatus: 'loading',
  tutorActiveRequest: { requestId: 'act_002' },
};

export function createInitialAppState(): AppState {
  return structuredClone(seededInitialState);
}

export function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'canvas/snapshotCreated':
      return {
        ...state,
        canvasSnapshotEvents: [...state.canvasSnapshotEvents, action.payload],
      };
    case 'ocr/requestStarted':
      return {
        ...state,
        ocrStatus: 'loading',
        ocrError: undefined,
        ocrActiveRequest: action.payload,
      };
    case 'ocr/requestSucceeded':
      if (state.ocrActiveRequest?.requestId && state.ocrActiveRequest.requestId !== action.payload.requestId) {
        return state;
      }

      return {
        ...state,
        ocrStatus: 'success',
        ocrError: undefined,
        latestOcrParse: action.payload.parse,
        ocrActiveRequest: undefined,
      };
    case 'ocr/requestFailed':
      if (state.ocrActiveRequest?.requestId && state.ocrActiveRequest.requestId !== action.payload.requestId) {
        return state;
      }

      return {
        ...state,
        ocrStatus: 'error',
        ocrError: action.payload.error,
        ocrActiveRequest: undefined,
      };
    case 'ocr/confirmedExpressionSet':
      return {
        ...state,
        confirmedExpression: action.payload,
      };
    case 'tutor/requestStarted': {
      const existingRequestIndex = state.tutorActionRequests.findIndex(
        (request) => request.id === action.payload.actionRequest.id,
      );
      const runningActionRequest = { ...action.payload.actionRequest, status: 'running' as const };

      return {
        ...state,
        tutorStatus: 'loading',
        tutorError: undefined,
        tutorActiveRequest: { requestId: action.payload.requestId },
        tutorActionRequests:
          existingRequestIndex === -1
            ? [...state.tutorActionRequests, runningActionRequest]
            : state.tutorActionRequests.map((request, index) =>
                index === existingRequestIndex ? runningActionRequest : request,
              ),
      };
    }
    case 'tutor/requestSucceeded': {
      if (state.tutorActiveRequest?.requestId && state.tutorActiveRequest.requestId !== action.payload.requestId) {
        return state;
      }

      const nextActionRequests = state.tutorActionRequests.map((request) =>
        request.id === action.payload.requestId ? { ...request, status: 'completed' as const } : request,
      );

      return {
        ...state,
        tutorStatus: 'success',
        tutorError: undefined,
        tutorConversation: [...state.tutorConversation, action.payload.message],
        tutorActionRequests: action.payload.actionRequest
          ? [...nextActionRequests, action.payload.actionRequest]
          : nextActionRequests,
        tutorActiveRequest: undefined,
      };
    }
    case 'tutor/requestFailed':
      if (state.tutorActiveRequest?.requestId && state.tutorActiveRequest.requestId !== action.payload.requestId) {
        return state;
      }

      return {
        ...state,
        tutorStatus: 'error',
        tutorError: action.payload.error,
        tutorActionRequests: state.tutorActionRequests.map((request) =>
          request.id === action.payload.requestId ? { ...request, status: 'rejected' as const } : request,
        ),
        tutorActiveRequest: undefined,
      };
    case 'tutor/messageAppended':
      return {
        ...state,
        tutorConversation: [...state.tutorConversation, action.payload],
      };
    default:
      return state;
  }
}

export interface AppStateDispatchHelpers {
  dispatch: React.Dispatch<AppStateAction>;
  createCanvasSnapshot: (snapshot: CanvasSnapshotEvent) => void;
  startOcrRequest: (request: OcrRequestLifecycle) => void;
  completeOcrRequest: (payload: { requestId: string; parse: OcrParseResult }) => void;
  failOcrRequest: (payload: { requestId: string; error: string }) => void;
  setConfirmedExpression: (expression: ConfirmedExpression | null) => void;
  startTutorRequest: (payload: { requestId: string; actionRequest: TutorActionRequest }) => void;
  completeTutorRequest: (payload: {
    requestId: string;
    message: TutorMessage;
    actionRequest?: TutorActionRequest;
  }) => void;
  failTutorRequest: (payload: { requestId: string; error: string }) => void;
  appendTutorMessage: (message: TutorMessage) => void;
}

interface AppStateContextValue {
  state: AppState;
  actions: AppStateDispatchHelpers;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, undefined, createInitialAppState);

  const actions = useMemo<AppStateDispatchHelpers>(
    () => ({
      dispatch,
      createCanvasSnapshot: (snapshot) => dispatch({ type: 'canvas/snapshotCreated', payload: snapshot }),
      startOcrRequest: (request) => dispatch({ type: 'ocr/requestStarted', payload: request }),
      completeOcrRequest: (payload) => dispatch({ type: 'ocr/requestSucceeded', payload }),
      failOcrRequest: (payload) => dispatch({ type: 'ocr/requestFailed', payload }),
      setConfirmedExpression: (expression) =>
        dispatch({ type: 'ocr/confirmedExpressionSet', payload: expression }),
      startTutorRequest: (payload) => dispatch({ type: 'tutor/requestStarted', payload }),
      completeTutorRequest: (payload) => dispatch({ type: 'tutor/requestSucceeded', payload }),
      failTutorRequest: (payload) => dispatch({ type: 'tutor/requestFailed', payload }),
      appendTutorMessage: (message) => dispatch({ type: 'tutor/messageAppended', payload: message }),
    }),
    [dispatch],
  );

  const value = useMemo(() => ({ state, actions }), [actions, state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context.state;
}

export function useAppStateActions() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateActions must be used within an AppStateProvider');
  }
  return context.actions;
}
