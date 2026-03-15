# kratulus-ai
Ace your Calculus exams!

## Calculus Lab execution roadmap (from idea to shipped MVP)

You asked: **"What do I do now?"**

Short answer: build a **single end-to-end slice** first (UI → stylus input → OCR → AI hint), then harden it.
This document is your practical build order.

---

## 1) Immediate plan (next 7 days)

### Day 1 — Lock scope and setup
- Freeze the Stitch UI as the source of truth (no visual drift).
- Pick stack:
  - **Frontend:** Next.js + Tailwind + TypeScript
  - **Canvas:** `pointer events` + HTML canvas
  - **Backend:** Node/Next API routes or FastAPI (pick one and stick to it)
  - **Realtime:** WebSocket for OCR/tutor stream
- Write a one-page PRD with only 3 core user flows:
  1. Write math with tablet.
  2. Get OCR parse in right panel.
  3. Ask for “Step-by-step hint.”

### Day 2 — Pixel-perfect shell
- Build static UI from your Stitch HTML:
  - top nav, left roadmap, center canvas, right OCR+tutor panels, footer.
- Keep exact colors/fonts/spacing from prototype.
- Add dark mode parity.

### Day 3 — Stylus canvas
- Implement drawing with pointer events.
- Support pen + eraser + color picker controls shown in UI.
- Save stroke events with timestamps.

### Day 4 — OCR v1
- Add OCR pipeline from canvas snapshots every 1–2 seconds while writing.
- Parse to LaTeX and show live log entries in OCR stream panel.
- Show confidence and "processing" status.

### Day 5 — Tutor v1
- Hook “Step-by-Step Hint” button to AI endpoint.
- Pass structured context:
  - OCR output
  - current module/topic
  - student’s latest attempt
- Return short pedagogical hint (not full solution).

### Day 6 — Validation + polish
- Test with 20 real handwritten expressions.
- Log latency for OCR + tutor responses.
- Fix biggest UX pain points (lag, parse errors, unclear hints).

### Day 7 — Demo build
- Record a demo flow:
  1. Write derivative problem.
  2. OCR recognizes expression.
  3. AI gives hint + identifies likely mistake.
- Tag this as **MVP-alpha**.

---

## 2) MVP definition (what to ship first)

Ship only this:
1. **Exact UI match** with your Stitch prototype.
2. **Deco Mini 7-friendly canvas** (pointer events, smooth strokes).
3. **Real-time OCR stream** to LaTeX for single-line expressions.
4. **AI hinting** for derivative + chain rule + partial derivative tasks.
5. **Session replay** from stored strokes/events.

If those 5 are working, you have a real product demo.

---

## 3) 6-week delivery roadmap (practical)

### Week 1 — UI fidelity
- Convert prototype into reusable components.
- Acceptance criteria:
  - visual parity on desktop and tablet layouts.

### Week 2 — Input engine
- Production-grade stylus interactions and tool states.
- Acceptance criteria:
  - stable writing at 60 FPS target on normal hardware.

### Week 3 — OCR pipeline
- Canvas capture, OCR parse, confidence display, correction loop.
- Acceptance criteria:
  - >85% expression accuracy on initial dataset.

### Week 4 — Tutor intelligence
- Step hints + error identification + LaTeX conversion.
- Add symbolic checker for answer validation.
- Acceptance criteria:
  - correct math and useful hints in curated test set.

### Week 5 — Learning layer
- Progress tracking + recommendations + module continuity.
- Acceptance criteria:
  - resume session and get sensible “next step.”

### Week 6 — Launch prep
- Auth, telemetry, reliability alerts, beta onboarding.
- Acceptance criteria:
  - run beta with feedback loop and rollback safety.

---

## 4) Build order for your exact UI sections

1. **Center canvas first** (this is the product core).
2. **Right OCR stream second** (makes “live intelligence” visible).
3. **Tutor panel third** (converts data into teaching value).
4. **Left roadmap panel fourth** (progress and module structure).
5. **Footer/meta last** (system polish).

---

## 5) Engineering checklist (copy into tickets)

### Frontend
- [ ] Import exact fonts (`Public Sans`, `JetBrains Mono`).
- [ ] Implement design tokens: `primary`, `secondary`, `background-light`, `background-dark`.
- [ ] Componentize UI (`TopNav`, `RoadmapPanel`, `CanvasWorkspace`, `ActionBar`, `OcrStreamPanel`, `TutorPanel`, `FooterMeta`).
- [ ] Add responsive behavior matching prototype layout.

### Canvas + Tablet
- [ ] Pointer event capture (`pointerdown/move/up`).
- [ ] Pressure-aware stroke width where available.
- [ ] Eraser mode and color state.
- [ ] Stroke event persistence for replay.

### OCR
- [ ] Snapshot queue from canvas.
- [ ] OCR service call + confidence scoring.
- [ ] LaTeX normalization.
- [ ] Real-time stream updates in right panel.

### AI Tutor
- [ ] Prompt templates for: hint, error-check, proof, latex conversion.
- [ ] Inject OCR + module context.
- [ ] Add symbolic verification before response.
- [ ] Guardrail to avoid giving full solution by default.

### Platform
- [ ] Session storage schema.
- [ ] Basic auth.
- [ ] Telemetry: OCR latency, tutor latency, confidence, user actions.
- [ ] Error alerting and fallback messages.

---

## 6) Success metrics (first beta)

- OCR median latency: **< 700ms**
- Tutor median latency: **< 2.0s**
- OCR expression accuracy: **> 90%** on target handwriting set
- Hint quality score: **≥ 4/5** from test users
- Session completion rate: **> 60%** for first guided module

---

## 7) What you should do right now (today)

1. Create project board columns: `Backlog`, `This Week`, `In Progress`, `Blocked`, `Done`.
2. Add 10 tickets from the checklist above.
3. Start with ticket: **“Implement pixel-perfect static shell from Stitch HTML.”**
4. Then ticket: **“Add pointer-based drawing on center canvas.”**
5. Do a daily demo (even if rough) to keep momentum.

If you execute only those five steps today, you leave the idea phase and enter build mode immediately.

## Execution backlog

I generated an AI-ready task backlog in `TASKS.md` with 20 prioritized implementation tasks, prompts, dependencies, and definition-of-done checklists.

=======
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
