import { NextResponse } from 'next/server';
import type {
  TutorActionRequest,
  TutorMessage,
  TutorRequestPayload,
  TutorResponsePayload,
} from '@/lib/contracts';

const MOCK_MODE = true;

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
}

function createErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[],
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(body, { status });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTutorRole(value: unknown): value is TutorMessage['role'] {
  return value === 'tutor' || value === 'student' || value === 'system';
}

function isRequestedAction(value: unknown): value is TutorActionRequest['type'] {
  return (
    value === 'step_hint'
    || value === 'identify_error'
    || value === 'synthesize_proof'
    || value === 'evaluate_point'
  );
}

function validateTutorMessage(value: unknown, index: number): string[] {
  if (!isObject(value)) {
    return [`conversation[${index}] must be an object.`];
  }

  const errors: string[] = [];

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    errors.push(`conversation[${index}].id must be a non-empty string.`);
  }

  if (!isTutorRole(value.role)) {
    errors.push(`conversation[${index}].role must be one of tutor|student|system.`);
  }

  if (typeof value.content !== 'string' || value.content.trim().length === 0) {
    errors.push(`conversation[${index}].content must be a non-empty string.`);
  }

  if (typeof value.createdAt !== 'string' || value.createdAt.trim().length === 0) {
    errors.push(`conversation[${index}].createdAt must be a non-empty string.`);
  }

  return errors;
}

function validateTutorRequest(body: unknown): {
  valid: boolean;
  errors: string[];
  payload?: TutorRequestPayload;
} {
  if (!isObject(body)) {
    return {
      valid: false,
      errors: ['Payload must be a JSON object.'],
    };
  }

  const errors: string[] = [];

  if (
    typeof body.confirmedExpressionLatex !== 'string'
    || body.confirmedExpressionLatex.trim().length === 0
  ) {
    errors.push('confirmedExpressionLatex must be a non-empty string.');
  }

  if (!Array.isArray(body.conversation)) {
    errors.push('conversation must be an array.');
  }

  if (Array.isArray(body.conversation)) {
    body.conversation.forEach((message, index) => {
      errors.push(...validateTutorMessage(message, index));
    });
  }

  if (
    typeof body.requestedAction !== 'undefined'
    && !isRequestedAction(body.requestedAction)
  ) {
    errors.push('requestedAction must be one of step_hint|identify_error|synthesize_proof|evaluate_point.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    payload: {
      confirmedExpressionLatex: body.confirmedExpressionLatex as string,
      conversation: body.conversation as TutorMessage[],
      requestedAction: body.requestedAction as TutorActionRequest['type'] | undefined,
    },
  };
}

function buildMockTutorResponse(payload: TutorRequestPayload): TutorResponsePayload {
  const action = payload.requestedAction ?? 'step_hint';

  return {
    message: {
      id: 'msg_mock_tutor_001',
      role: 'tutor',
      content: `Mock tutor response for ${action}: start from ${payload.confirmedExpressionLatex}.`,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    actionRequest: {
      id: 'act_mock_001',
      type: action,
      status: 'completed',
      requestedAt: '2026-01-01T00:00:00.000Z',
      detail: 'Deterministic mock action completion.',
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const validation = validateTutorRequest(body);
  if (!validation.valid || !validation.payload) {
    return createErrorResponse(422, 'VALIDATION_ERROR', 'Invalid tutor request payload.', validation.errors);
  }

  try {
    if (MOCK_MODE) {
      const response = buildMockTutorResponse(validation.payload);
      return NextResponse.json(response, { status: 200 });
    }

    return createErrorResponse(501, 'INTERNAL_ERROR', 'Tutor service is not implemented for non-mock mode.');
  } catch {
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Unexpected tutor server error.');
  }
}
