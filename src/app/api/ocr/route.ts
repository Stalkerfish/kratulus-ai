import { NextResponse } from 'next/server';
import type { OcrRequestPayload, OcrResponsePayload } from '@/lib/contracts';

const MOCK_MODE = true;

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR';

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

function validateOcrRequest(body: unknown): {
  valid: boolean;
  errors: string[];
  payload?: OcrRequestPayload;
} {
  if (!isObject(body)) {
    return {
      valid: false,
      errors: ['Payload must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const snapshotId = body.snapshotId;
  const strokeCount = body.strokeCount;
  const inkModel = body.inkModel;

  if (typeof snapshotId !== 'string' || snapshotId.trim().length === 0) {
    errors.push('snapshotId must be a non-empty string.');
  }

  if (!Number.isInteger(strokeCount) || (strokeCount as number) < 0) {
    errors.push('strokeCount must be a non-negative integer.');
  }

  if (typeof inkModel !== 'string' || inkModel.trim().length === 0) {
    errors.push('inkModel must be a non-empty string.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    payload: {
      snapshotId,
      strokeCount,
      inkModel,
    },
  };
}

function buildMockOcrResponse(payload: OcrRequestPayload): OcrResponsePayload {
  const normalizedStrokeCount = Math.max(payload.strokeCount, 1);
  const confidence = Math.min(0.99, 0.8 + normalizedStrokeCount / 500);

  return {
    parse: {
      latex: `\\nabla f(x) = ${normalizedStrokeCount}x`,
      plainText: `gradient of f of x equals ${normalizedStrokeCount} x`,
      confidence,
      sourceSnapshotId: payload.snapshotId,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    streamMessages: [
      `[mock] snapshot=${payload.snapshotId}`,
      `[mock] strokes=${payload.strokeCount}`,
      `[mock] model=${payload.inkModel}`,
      '[mock] parse complete',
    ],
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const validation = validateOcrRequest(body);
  if (!validation.valid || !validation.payload) {
    return createErrorResponse(422, 'VALIDATION_ERROR', 'Invalid OCR request payload.', validation.errors);
  }

  try {
    if (MOCK_MODE) {
      const response = buildMockOcrResponse(validation.payload);
      return NextResponse.json(response, { status: 200 });
    }

    return createErrorResponse(501, 'INTERNAL_ERROR', 'OCR service is not implemented for non-mock mode.');
  } catch {
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Unexpected OCR server error.');
  }
}
