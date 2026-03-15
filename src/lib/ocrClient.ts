import type { OcrRequestPayload, OcrResponsePayload } from '@/lib/contracts';
import { postJson } from '@/lib/apiClient';

export function requestOcrParse(payload: OcrRequestPayload): Promise<OcrResponsePayload> {
  return postJson<OcrRequestPayload, OcrResponsePayload>('/api/ocr', payload);
}
