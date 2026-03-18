import type { OcrParseResult, OcrRequestPayload } from '@/lib/contracts';

interface ProcessInkStroke {
  x: number[];
  y: number[];
  t: number[];
}

interface ProcessInkResponse {
  ocr?: {
    engine: string;
    latex_styled?: string;
    latex_simplified?: string;
    text?: string;
    confidence?: number;
  };
  mathpix?: {
    engine?: string;
    latex_styled?: string;
    latex_simplified?: string;
    text?: string;
    confidence?: number;
  };
}

function nowStamp() {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function mapStrokeToProcessInkStroke(points: OcrRequestPayload['strokes'][number]['points']): ProcessInkStroke {
  const x: number[] = [];
  const y: number[] = [];
  const t: number[] = [];

  points.forEach((point) => {
    x.push(point.x);
    y.push(point.y);
    t.push(point.timestamp);
  });

  return { x, y, t };
}

export async function requestOcrParse(payload: OcrRequestPayload): Promise<OcrParseResult> {
  const response = await fetch('/api/ocr/process-ink', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      strokes: payload.strokes.map((stroke) => mapStrokeToProcessInkStroke(stroke.points)),
      canvas_meta: payload.canvasMeta,
      preferred_engine: payload.inkModel,
    }),
  });

  if (!response.ok) {
    throw new Error(`OCR request failed (${response.status})`);
  }

  const data = (await response.json()) as ProcessInkResponse;
  const ocr = data.ocr || data.mathpix;

  return {
    latex: ocr?.latex_styled ?? ocr?.latex_simplified ?? '',
    plainText: ocr?.text ?? '',
    confidence: ocr?.confidence ?? 0,
    sourceSnapshotId: payload.snapshotId,
    engine: (ocr?.engine as any) || payload.inkModel,
    updatedAt: nowStamp(),
  };
}
