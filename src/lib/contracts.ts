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
  engine: 'myscript' | 'pix2text' | 'mathpix';
  updatedAt: string;
}

export interface ConfirmedExpression {
  latex: string;
  confirmedAt: string;
  note?: string;
}

export type CanvasTool = 'pen' | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface StrokeEvent {
  id: string;
  points: StrokePoint[];
  tool: CanvasTool;
  color: string;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
}

export interface OcrRequestPayload {
  snapshotId: string;
  strokeCount: number;
  strokes: StrokeEvent[];
  inkModel: 'mathpix' | 'myscript' | 'pix2text';
  canvasMeta: {
    width: number;
    height: number;
    xDPI: number;
    yDPI: number;
  };
  sessionId: string;
  latestStrokeAt: number | null;
  trigger: 'stroke-complete' | 'inactivity';
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
