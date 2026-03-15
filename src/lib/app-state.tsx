'use client';

import React, { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  AsyncStatus,
  CanvasSnapshotEvent,
  ConfirmedExpression,
  OcrParseResult,
  TutorActionRequest,
  TutorMessage,
  TutorRequestPayload,
  TutorResponsePayload,
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
    };

interface AppStateContextValue extends AppState {
  dispatch: React.Dispatch<AppAction>;
  invokeTutor: (payload: TutorRequestPayload) => Promise<TutorResponsePayload>;
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
    plainText: 'f prime of x equals 2x cosine of x squared plus 3',
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
  ],
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
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  if (!payload.confirmedExpressionLatex) {
    throw new Error('Missing confirmed expression.');
  }

  const content = payload.requestedAction
    ? tutorActionCopy(payload.requestedAction)
    : `Given ${payload.confirmedExpressionLatex}, focus on ${
        payload.conversation[payload.conversation.length - 1]?.content ?? 'the next simplification step'
      }.`;

  return {
    message: {
      id: `msg_${crypto.randomUUID()}`,
      role: 'tutor',
      content,
      createdAt: nowTimeLabel(),
    },
  };
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
        ? state.tutorActionRequests.map((request) =>
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
        ? state.tutorActionRequests.map((request) =>
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
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return state;
}
