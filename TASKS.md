# Calculus Lab — AI-Ready Task Backlog

Use this as a copy/paste backlog for GitHub Issues, Linear, or Jira.
Each task includes:
- **Goal**: what gets built
- **AI Prompt**: what to ask an AI coding assistant
- **Definition of Done**: acceptance criteria
- **Depends on**: required predecessor tasks

---

## Epic 1 — Project Bootstrap

### TASK-001: Initialize Next.js + Tailwind + TypeScript app
**Goal**
Create the base web app scaffolding for the Stitch UI implementation.

**AI Prompt**
"Initialize a Next.js app with TypeScript, Tailwind CSS, ESLint, and App Router. Add scripts for dev/build/lint. Keep structure simple and production-ready."

**Definition of Done**
- `npm run dev`, `npm run build`, and `npm run lint` succeed.
- Base `app/layout.tsx` and `app/page.tsx` render correctly.
- Tailwind configured and working.

**Depends on**
- None

---

### TASK-002: Add global design tokens and typography
**Goal**
Match core visual identity from prototype.

**AI Prompt**
"Configure Tailwind theme tokens for `primary`, `secondary`, `background-light`, and `background-dark`. Add Public Sans and JetBrains Mono fonts globally."

**Definition of Done**
- Tokens available in Tailwind classes.
- Fonts applied globally and mono utility works.
- Dark/light classes render correctly.

**Depends on**
- TASK-001

---

## Epic 2 — Pixel-Perfect UI Shell

### TASK-003: Build top navigation component
**Goal**
Implement header/nav exactly as prototype.

**AI Prompt**
"Create a `TopNav` React component matching this layout: logo block, module nav links, tablet connection chip, notifications button, avatar. Keep spacing and typography close to provided HTML."

**Definition of Done**
- Desktop behavior matches prototype.
- Tablet connection status area visible on md+ screens.
- No layout overflow at common widths (1280, 1440, 1600).

**Depends on**
- TASK-002

---

### TASK-004: Build left roadmap sidebar
**Goal**
Create module progress and mini visualization panel.

**AI Prompt**
"Implement `RoadmapPanel` with current module, progress bar, lesson nav items, CTA button, and tangent mini-visualization block."

**Definition of Done**
- Sidebar contents match prototype hierarchy.
- Progress bar and active state styling implemented.
- Scroll behavior works when viewport height is short.

**Depends on**
- TASK-002

---

### TASK-005: Build center canvas workspace layout (static)
**Goal**
Create canvas area shell with toolbars and action bar (non-functional controls initially).

**AI Prompt**
"Build `CanvasWorkspace` and `ActionBar` static components matching prototype: top-left drawing tool cluster, top-right record button, center handwriting placeholder text, bottom metadata row, and action buttons."

**Definition of Done**
- Visual structure and spacing align with prototype.
- Buttons rendered with correct variants.
- Canvas region supports full-height layout in main grid.

**Depends on**
- TASK-002

---

### TASK-006: Build right OCR + Tutor panels (static)
**Goal**
Create OCR stream card and tutor card exactly as UI.

**AI Prompt**
"Implement `OcrStreamPanel` and `TutorPanel` static components with blueprint/canvas backgrounds, sample stream logs, guidance card, recommendations, metrics, and input/send UI."

**Definition of Done**
- Both cards visually match the provided HTML structure.
- Typography and color accents are consistent.
- Panel heights behave correctly in full viewport layout.

**Depends on**
- TASK-002

---

### TASK-007: Compose full app shell + responsive behavior
**Goal**
Integrate all components into final 3-column layout.

**AI Prompt**
"Assemble `TopNav`, `RoadmapPanel`, `CanvasWorkspace`, `ActionBar`, `OcrStreamPanel`, `TutorPanel`, and footer into a responsive 12-column grid that mirrors the prototype behavior from mobile to desktop."

**Definition of Done**
- Desktop: left/center/right columns match proportions.
- Mobile: sections stack cleanly with no clipped content.
- No console errors.

**Depends on**
- TASK-003, TASK-004, TASK-005, TASK-006

---

## Epic 3 — Stylus & Canvas Engine

### TASK-008: Implement drawable HTML canvas with pointer events
**Goal**
Enable pen drawing in center workspace.

**AI Prompt**
"Implement a high-DPI canvas drawing engine in React using pointer events (`pointerdown`, `pointermove`, `pointerup`). Support mouse + stylus input with smooth line rendering."

**Definition of Done**
- User can draw continuous strokes.
- Canvas scales correctly for devicePixelRatio.
- Drawing remains aligned after resize.

**Depends on**
- TASK-007

---

### TASK-009: Add pen/eraser/color tool state
**Goal**
Make toolbar controls functional.

**AI Prompt**
"Wire the tool buttons to canvas state: pen mode, eraser mode, and color selection. Keep UI active states synced with current tool."

**Definition of Done**
- Pen draws with selected color.
- Eraser removes strokes (or draws with background color as interim).
- Active tool is visually highlighted.

**Depends on**
- TASK-008

---

### TASK-010: Persist stroke events for replay
**Goal**
Record drawing sessions as time-sequenced events.

**AI Prompt**
"Create a stroke event model and capture timestamped events while drawing. Add `Export Session` and `Replay Session` utilities for local testing."

**Definition of Done**
- Session JSON can be exported.
- Replay reconstructs drawing order/time.
- Event schema documented in code comments.

**Depends on**
- TASK-008

---

## Epic 4 — OCR Stream

### TASK-011: Add OCR service adapter interface
**Goal**
Abstract OCR provider so it can be swapped later.

**AI Prompt**
"Create an OCR adapter interface with one mock implementation and one real provider stub. Return text, latex, confidence, and processing metadata."

**Definition of Done**
- OCR adapter has typed request/response contracts.
- Mock mode works offline for development.
- Errors surfaced cleanly to UI.

**Depends on**
- TASK-007

---

### TASK-012: Snapshot canvas and push OCR updates
**Goal**
Send periodic canvas captures to OCR and stream results.

**AI Prompt**
"Implement periodic canvas snapshots (throttled) and send them to the OCR adapter. Append results to OCR stream panel with timestamp and confidence status."

**Definition of Done**
- OCR panel updates during writing.
- Requests are throttled to avoid overload.
- Failed OCR calls show graceful error status.

**Depends on**
- TASK-008, TASK-011

---

### TASK-013: Add editable OCR confirmation row
**Goal**
Allow user to correct OCR output before tutoring.

**AI Prompt**
"Add UI under OCR stream showing latest parsed LaTeX in an editable input and a ‘Confirm’ action that sets the canonical expression for tutor requests."

**Definition of Done**
- User can edit parsed output.
- Confirmed expression is stored in app state.
- Tutor uses confirmed expression, not raw OCR text.

**Depends on**
- TASK-012

---

## Epic 5 — AI Tutor Integration

### TASK-014: Build tutor API contract + mock backend
**Goal**
Establish response format before model integration.

**AI Prompt**
"Define tutor request/response schema for actions: `hint`, `identify_error`, `synthesize_proof`, `to_latex`. Implement a mock API route returning structured responses."

**Definition of Done**
- API contract documented in code types.
- Mock responses render in tutor panel.
- No hard-coded UI strings outside response mapping.

**Depends on**
- TASK-007

---

### TASK-015: Wire action buttons to tutor requests
**Goal**
Make bottom action bar trigger tutor behaviors.

**AI Prompt**
"Connect action buttons to tutor API calls with loading/error/success states. Display returned explanation in the tutor panel and append to conversation context."

**Definition of Done**
- All action buttons call correct tutor action.
- Loading and error states are visible.
- Last response appears in tutor guidance card.

**Depends on**
- TASK-014, TASK-013

---

### TASK-016: Add prompt guardrails and response validator
**Goal**
Prevent over-solving and low-quality tutor output.

**AI Prompt**
"Implement tutor prompt policy and response validation: prefer hints first, avoid full final answers unless user explicitly asks, enforce concise stepwise pedagogy."

**Definition of Done**
- Policy configuration exists in one file.
- Validator flags non-compliant responses.
- UI shows fallback message when validation fails.

**Depends on**
- TASK-015

---

## Epic 6 — Progress & Session UX

### TASK-017: Add module/progress state model
**Goal**
Drive left sidebar content from real data.

**AI Prompt**
"Create a progress data model for modules/lessons and bind the left roadmap UI to that state. Include completion percentage and active lesson."

**Definition of Done**
- Sidebar is data-driven.
- Active item and progress bar update from state.
- Default seed data included.

**Depends on**
- TASK-004

---

### TASK-018: Save and restore sessions
**Goal**
Persist session context across reloads.

**AI Prompt**
"Implement local persistence for strokes, confirmed OCR expression, tutor interactions, and module context. Restore state on app load."

**Definition of Done**
- Refresh keeps session continuity.
- Corrupted storage is handled safely.
- User can clear session manually.

**Depends on**
- TASK-010, TASK-013, TASK-015

---

## Epic 7 — Quality, Observability, and Beta Readiness

### TASK-019: Instrument latency and quality metrics
**Goal**
Track OCR/tutor performance from day one.

**AI Prompt**
"Add telemetry hooks for OCR latency, tutor latency, OCR confidence, tutor action usage, and error counts. Show a simple debug metrics panel in development mode."

**Definition of Done**
- Metrics emitted on key flows.
- Dev panel displays last N events.
- No PII logged by default.

**Depends on**
- TASK-012, TASK-015

---

### TASK-020: MVP acceptance test script
**Goal**
Define a deterministic demo validation flow.

**AI Prompt**
"Create a test checklist/script that validates the MVP user journey: draw expression, OCR parse appears, confirm parse, request hint, receive tutor response, replay session."

**Definition of Done**
- Script is documented and runnable by humans.
- Covers happy path + one OCR failure case.
- Used as release gate for MVP-alpha.

**Depends on**
- TASK-018, TASK-019

---

## Suggested sprint cut (start now)

### Sprint 1 (Week 1)
- TASK-001 to TASK-007

### Sprint 2 (Week 2)
- TASK-008 to TASK-013

### Sprint 3 (Week 3)
- TASK-014 to TASK-016

### Sprint 4 (Week 4)
- TASK-017 to TASK-020

---

## How to use this with AI effectively

For each ticket:
1. Paste the **AI Prompt** into your coding assistant.
2. Ask for a **small PR only** (1 task at a time).
3. Require:
   - updated tests/checks,
   - short architecture notes,
   - rollback plan.
4. Merge only when **Definition of Done** is met.
