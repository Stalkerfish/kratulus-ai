# kratulus-ai
Ace your Calculus exams!

## Product roadmap: Calculus 3 AI Tutor ("Calculus Lab")

This roadmap turns your concept into an executable plan, while preserving the exact look-and-feel of your Stitch prototype.

### North-star outcome
Ship a web app where a student can write with a Deco Mini 7 tablet, get real-time OCR on handwritten multivariable calculus expressions, and receive live AI tutoring with step-by-step guidance.

### Product principles
- **UI fidelity first:** implement the prototype pixel-for-pixel before feature expansion.
- **Real-time feedback:** OCR + tutoring latency target under 500ms for in-session interactions.
- **Math correctness:** symbolic checks and explanation quality are non-negotiable.
- **Session continuity:** every tutoring session is replayable and exportable.

---

## Phase 0 — Foundation (Week 0–1)

### Goals
- Lock product scope and success metrics.
- De-risk stack choices for canvas input, OCR, and AI orchestration.

### Deliverables
- Finalized PRD with user stories:
  - “Write equation with stylus → parse expression → explain next step.”
  - “Ask AI for hint / error detection / latex conversion.”
- Architecture decision record (ADR):
  - Frontend: Next.js + Tailwind (for exact prototype match).
  - Realtime: WebSocket channel for OCR/tutor events.
  - OCR pipeline: stroke capture + image fallback OCR.
  - AI tutor service: prompt orchestration + symbolic validator.
- Baseline telemetry plan:
  - OCR confidence, tutor latency, step-accuracy score, engagement metrics.

### Exit criteria
- One-page technical architecture approved.
- Milestone backlog prioritized by MVP value.

---

## Phase 1 — UI Fidelity Build (Week 1–2)

### Goals
- Recreate your provided HTML UI exactly in app code.

### Deliverables
- Responsive shell matching:
  - Top navigation, roadmap sidebar, center canvas area, OCR stream panel, AI tutor panel, footer.
- Theme and style tokens copied from prototype:
  - `primary`, `secondary`, `background-light`, `background-dark`.
  - typography (`Public Sans`, `JetBrains Mono`), grid backgrounds, spacing.
- Componentized structure:
  - `TopNav`, `RoadmapPanel`, `CanvasWorkspace`, `ActionBar`, `OcrStreamPanel`, `TutorPanel`, `FooterMeta`.

### Exit criteria
- Visual diff pass against prototype screenshots (desktop + tablet breakpoints).
- Stakeholder sign-off that “this looks exactly like Stitch output.”

---

## Phase 2 — Stylus & Canvas Engine (Week 2–4)

### Goals
- Make Deco Mini 7 writing feel natural and reliable.

### Deliverables
- Pointer/stylus input layer:
  - pressure, tilt (if available), smoothing, stroke segmentation.
- Canvas tools from UI:
  - pen, eraser, gesture/select, color palette, layer metadata.
- Session recording:
  - time-stamped stroke events for replay and OCR alignment.
- Device status indicator:
  - connected/disconnected handling for tablet presence.

### Exit criteria
- 60 FPS drawing on target hardware.
- No visible lag in common writing flows.

---

## Phase 3 — OCR + Math Parsing Pipeline (Week 3–6)

### Goals
- Convert handwritten math into structured, machine-usable math.

### Deliverables
- OCR ingestion from canvas snapshots and/or stroke vectors.
- Math expression parser to LaTeX + AST.
- Confidence-aware stream output (drives right panel logs).
- Correction loop:
  - user can confirm/edit parsed math.

### Exit criteria
- >90% expression-level accuracy on internal Calc 3 handwriting dataset.
- OCR stream updates in near-real time.

---

## Phase 4 — AI Tutor Brain (Week 5–8)

### Goals
- Deliver tutoring quality beyond “chatbot answers.”

### Deliverables
- Tutor modes tied to your action buttons:
  - Step-by-Step Hint
  - Identify Error
  - Synthesize Proof
  - Convert to LaTeX
- Prompt orchestration with context:
  - current problem, OCR parse, student attempt history, curriculum module.
- Symbolic verification layer:
  - compare student derivations/answers with CAS checks.
- Pedagogy policy:
  - avoid over-solving; prioritize hints and Socratic prompts.

### Exit criteria
- Tutor response quality rubric passes (correctness + instructional clarity).
- Median tutor response latency < 2s.

---

## Phase 5 — Curriculum, Progress, and Analytics (Week 7–9)

### Goals
- Turn isolated sessions into a guided learning journey.

### Deliverables
- Module map for Calculus 3 topics:
  - vectors, partial derivatives, multiple integrals, vector fields, line/surface integrals.
- Progress model driving left sidebar percentages and recommendations.
- Session summaries:
  - misconceptions, strengths, suggested next drills.
- Teacher/student dashboard basics (optional if solo launch).

### Exit criteria
- Users can resume from prior sessions with coherent recommendations.

---

## Phase 6 — Reliability, Security, and Launch (Week 9–10)

### Goals
- Production readiness.

### Deliverables
- Auth + user data protection (encryption in transit and at rest).
- Observability:
  - logs, tracing, alerts for OCR/tutor outages and latency regressions.
- Guardrails:
  - content moderation, anti-hallucination checks, fallback explanations.
- Beta launch plan:
  - onboarding flow, bug triage board, feedback forms.

### Exit criteria
- Staging soak test complete.
- Public beta release with rollback strategy.

---

## MVP slice (build this first)
If you want the fastest path to “working product,” ship this minimal vertical slice:
1. Pixel-perfect UI shell.
2. Working stylus canvas (Deco Mini 7 compatible through Pointer Events).
3. OCR of one-line expressions to LaTeX.
4. AI hint generation for derivatives + chain rule + partial derivatives.
5. Save/replay sessions.

This gives you a demoable core in ~4–6 weeks.

## Suggested immediate next actions (this week)
1. Freeze the UI spec from your Stitch prototype (no visual drift).
2. Create clickable tickets for each Phase 1 deliverable.
3. Build canvas proof-of-concept and validate tablet input quality.
4. Collect 100 handwritten sample expressions for OCR benchmarking.
5. Define tutoring rubric (correctness, helpfulness, non-spoiler behavior).
