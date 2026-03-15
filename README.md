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

