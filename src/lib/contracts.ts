export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CanvasSnapshotEvent {
  id: string;
  timestamp: string;
  label: string;
  strokeCount: number;
  status: 'captured' | 'processing' | 'parsed';
}

export interface OcrParseResult {
  latex: string;
  plainText: string;
  confidence: number;
  sourceSnapshotId: string;
  updatedAt: string;
}

export interface ConfirmedExpression {
  latex: string;
  confirmedAt: string;
  note?: string;
}

export interface OcrRequestPayload {
  snapshotId: string;
  strokeCount: number;
  inkModel: string;
}

export interface OcrResponsePayload {
  parse: OcrParseResult;
  streamMessages: string[];
}

export type TutorRole = 'tutor' | 'student' | 'system';

export interface TutorMessage {
  id: string;
  role: TutorRole;
  content: string;
  createdAt: string;
}

export interface TutorActionRequest {
  id: string;
  type: 'step_hint' | 'identify_error' | 'synthesize_proof' | 'evaluate_point';
  status: 'pending' | 'running' | 'completed' | 'rejected';
  requestedAt: string;
  detail?: string;
}

export interface TutorRequestPayload {
  confirmedExpressionLatex: string;
  conversation: TutorMessage[];
  requestedAction?: TutorActionRequest['type'];
}

export interface TutorResponsePayload {
  message: TutorMessage;
  actionRequest?: TutorActionRequest;
}

export interface OcrRequestLifecycle {
  requestId: string;
  snapshotId: string;
}

export interface TutorRequestLifecycle {
  requestId: string;
}
