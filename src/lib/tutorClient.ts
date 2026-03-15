import type { TutorRequestPayload, TutorResponsePayload } from '@/lib/contracts';
import { postJson } from '@/lib/apiClient';

export function requestTutorResponse(payload: TutorRequestPayload): Promise<TutorResponsePayload> {
  return postJson<TutorRequestPayload, TutorResponsePayload>('/api/tutor', payload);
}
