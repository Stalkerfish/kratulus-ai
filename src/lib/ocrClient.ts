import type { OcrParseResult, OcrRequestPayload } from '@/lib/contracts';

function nowStamp() {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export async function requestOcrParse(payload: OcrRequestPayload): Promise<OcrParseResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const confidenceFloor = payload.trigger === 'stroke-complete' ? 0.9 : 0.82;
  const confidence = Math.min(0.99, confidenceFloor + Math.random() * 0.08);

  return {
    latex: String.raw`\text{strokes}_{${payload.strokeCount}}`,
    plainText: `strokes ${payload.strokeCount}`,
    confidence,
    sourceSnapshotId: payload.snapshotId,
    updatedAt: nowStamp(),
  };
}
