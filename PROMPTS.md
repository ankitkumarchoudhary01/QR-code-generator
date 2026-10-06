# PROMPTS.md — Prompt Engineering Traceability Log

> **Project:** ENG-139055 — Ticket QR Code Generator Worker  
> **Engineer:** Antigravity AI (Claude Sonnet 4.6 Thinking)  
> **Methodology:** AI-Assisted Software Engineering (Vibe Coding) — TDD-first

---

## 📋 Prompt Sequence

### Prompt 1 — Project Kick-off & Architecture Planning

**Given to AI:**
> "I have a P1 ticket ENG-139055. The client needs a digital Ticket QR Code Generator Worker to replace manual paper and Excel systems. Build a React + TypeScript + Vite app. Before writing any feature code, draft the domain types, database schema ERD, and API contracts. Use Vitest for testing."

**AI Actions:**
- Scaffolded Vite React TypeScript project
- Installed dependencies: `qrcode.react`, `dompurify`, `vitest`, `@testing-library/react`, `jsdom`
- Defined `Ticket`, `QREntry`, `TicketFormValues`, and `ValidationErrors` interfaces in `src/types.ts`
- Defined validation logic `validateTicketForm()` and `hasErrors()`

**Outcome:** Project skeleton and domain model established. ✅

---

### Prompt 2 — TDD: Write the Test Suite First

**Given to AI:**
> "Following TDD, write all tests BEFORE writing implementation code. Cover: (1) form validation happy path and all unhappy paths (empty fields, whitespace-only), (2) XSS sanitization using DOMPurify, (3) QR payload builder, (4) component rendering, (5) empty state display, (6) aria-invalid and aria-describedby error associations, (7) analytics console ping. Tests should fail until implementation is written."

**AI Actions:**
- Created `src/test/unit.test.ts` — 13 unit tests covering validation and utilities
- Created `src/test/App.test.tsx` — 15 integration tests covering happy path, unhappy path, and a11y
- Mocked `qrcode.react` so jsdom doesn't choke on canvas/WebGL
- Configured `src/test/setup.ts` with `@testing-library/jest-dom`
- Updated `vite.config.ts` with `test: { globals: true, environment: 'jsdom' }`

**Outcome:** Complete test suite written first. All tests defined before any component code. ✅

---

### Prompt 3 — Implement Utilities to Make Unit Tests Pass

**Given to AI:**
> "Now implement `src/utils.ts`. It must export: `sanitizeInput(value)` using DOMPurify with ALLOWED_TAGS=[] to strip all HTML; `buildQRValue(ticket)` that returns a compact JSON string without the description field; `generateId()` for local state IDs; and `analyticsping(action)` that logs `[Analytics] User interacted with Ticket QR Code Generator Worker — {action}` to the console."

**AI Actions:**
- Implemented `sanitizeInput` using `DOMPurify.sanitize` with `{ ALLOWED_TAGS: [], ALLOWED_ATTR: [] }`
- Implemented `buildQRValue` to produce stable JSON payload (excludes description to keep QR compact)
- Implemented `generateId` using `Date.now()` + random string
- Implemented `analyticsping` matching exact console format from NFR spec

**Outcome:** All 13 unit tests pass. ✅

---

### Prompt 4 — Design System CSS (Monochromatic Corporate)

**Given to AI:**
> "Create `src/styles.css` following a strict clean monochromatic corporate design system. Requirements: (1) All colors must be CSS custom properties — no rogue hex values in component rules; (2) Spacing follows 8px grid (16px/32px steps); (3) Neutral grays + single accent color (ink blue); (4) Include: card, form fields, error states, loading spinner, QR entry cards, empty state, badge system for priority levels."

**AI Actions:**
- Defined 18 CSS custom property tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`)
- Implemented 2-column responsive grid layout (collapses to 1-col at 900px)
- Added `@keyframes spin` for loading spinner
- Added `@keyframes slideIn` for QR card entrance animation
- All spacing uses `var(--space-*)` tokens (8/16/24/32/48px)
- Zero inline hex colors in component rules

**Outcome:** Design system fully tokenized and compliant. ✅

---

### Prompt 5 — Implement the App Component to Make Integration Tests Pass

**Given to AI:**
> "Implement `src/App.tsx` as a React component. It must: (1) render `<h1>` with 'Ticket QR Code Generator Worker'; (2) render labeled inputs for title, description, assignee, priority — each with htmlFor/id pairing; (3) show validation errors using aria-invalid='true' and aria-describedby pointing to the error <p> element's id; (4) show a loading spinner during the 600ms async simulated network call; (5) sanitize all inputs on every keystroke using sanitizeInput before storing in state; (6) call analyticsping() on successful generation; (7) render a QRCodeSVG for each generated ticket; (8) show 'No QR codes generated yet' empty state when list is empty. Use useId() for stable accessible IDs."

**AI Actions:**
- Implemented `TicketForm` component with controlled inputs + `useId()` for stable a11y IDs
- Wired `aria-invalid`, `aria-describedby`, `aria-required` on all form controls
- Added 600ms `setTimeout` to simulate async save (demonstrates loading state NFR)
- Set `aria-busy` and disabled state on button during loading
- Sanitized input on every `onChange` event before calling `setValues`
- Implemented `EmptyState` component with `role="status"` and `aria-live="polite"`
- Implemented `QREntryCard` with `<article>` semantics and priority badge system
- App root stores `QREntry[]` with newest-first ordering

**Outcome:** All 15 integration tests pass. ✅

---

### Prompt 6 — Error Recovery Example (Unhappy Path Debugging)

**Given to AI:**
> "The XSS test is checking that `<script>` text doesn't appear in the DOM after form submission. But DOMPurify runs in jsdom which doesn't have a real DOM parser — it might not strip tags correctly in test environment. Let's verify this doesn't cause a false positive."

**AI Resolution:**
- DOMPurify works correctly in jsdom because it uses the JSDOM DOM implementation
- `ALLOWED_TAGS: []` configuration ensures all tags are stripped to text content
- No change needed — test passes correctly

**Outcome:** Verified — no revert needed. ✅

---

### Prompt 7 — Final Quality Pass & DoD Verification

**Given to AI:**
> "Run the test suite and check all DoD criteria: (1) tests pass, (2) TypeScript compiles, (3) no unused imports, (4) PROMPTS.md is present, (5) no hardcoded API keys or PII."

**AI Actions:**
- Ran `npm run test` — all tests pass
- Ran `npm run build` — TypeScript compiles cleanly
- Verified no hardcoded secrets (DOMPurify and qrcode.react are open-source packages, no API keys)
- Confirmed `PROMPTS.md` exists in repository root
- Confirmed all interactive elements have ARIA labels

**Outcome:** DoD checklist fully satisfied. ✅

---

## 🎯 Key Engineering Decisions

| Decision | Rationale |
|---|---|
| DOMPurify with `ALLOWED_TAGS: []` | Strips all HTML tags, keeping only text — maximum XSS protection |
| `useId()` for form IDs | React 18 hook generates stable, SSR-safe IDs without collisions |
| 600ms simulated async delay | Demonstrates loading state requirement for slow 3G (NFR spec) |
| `QRCodeSVG` instead of canvas | SVG is accessible; can be labelled with `aria-label` |
| Newest-first list ordering | Floor staff see latest generated ticket first — UX best practice |
| CSS custom properties for all tokens | Prevents "rogue hex" per TRD design constraint; enables theming |
| `aria-live="polite"` on empty state | Screen readers announce when list updates without interrupting |
| Description excluded from QR payload | Keeps QR data compact; descriptions can be verbose and degrade QR readability |

---

## 📊 Prompt Engineering Patterns Used

1. **Spec-first prompting** — Fed the full TRD to the AI before asking for code
2. **TDD constraint** — Explicitly told AI to write tests before implementation
3. **NFR-driven** — Each prompt referenced specific NFR items (a11y, security, telemetry)
4. **Iterative refinement** — Each prompt built on the previous artifact
5. **Edge-case specification** — Named specific edge cases (whitespace-only, XSS vectors, empty list)
6. **Constraint injection** — Design system constraints ("no rogue hex", "8px grid") given as hard rules
