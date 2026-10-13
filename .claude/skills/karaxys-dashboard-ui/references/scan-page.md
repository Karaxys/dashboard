# Active Scanner page (`app/dashboard/scan/page.tsx`)

This is the page the user calls sloppy, and the reference for the quality bar.
It drives the scanner end to end: pick a captured endpoint, pick a test or a
suite, supply identities, launch, watch, read findings.

## API contract (all through `apiFetch` from `lib/api.ts`)

| Call | Purpose | Notes |
|---|---|---|
| `GET /inventory?limit=500` | endpoint picker | label is `Method PathPattern`; `ID`, `BaseURL`, `Method`, `PathPattern`, `RiskLevel` |
| `GET /inventory/{id}` | Target Analysis + auto-victim hint | `SampleHeaders`, `SampleReqBody`, `captured_auth_available` |
| `GET /scan/test-types` | single-test list | `test_type, category, severity, description, requires_attacker_auth, requires_victim_auth, requires_distinct_principals` |
| `GET /scan/suite-presets` | suite list | `id, name, description, test_types` (empty = "all applicable") |
| `POST /scan` | single test | `{inventory_id, test_type, attack_method, attacker_token, auth_contexts:{attacker,victim}}` → `202 {job_id}` |
| `GET /scan-jobs/{id}` | single-test polling | terminal: `completed,failed,cancelled,timed_out`; `error` carries the message |
| `POST /scan/suite` | suite | `{inventory_id, suite, auth_contexts, attack_method, timeout_seconds}` → `202 {suite_id, job_count, test_types, skipped[]}` |
| `GET /scan/suites/{id}` | suite polling | `status_counts`, `total_findings`, `completed`, `jobs[]` |
| `GET /scan-results?job_id=` / `?suite_id=` | findings | `test_type, vulnerable, severity, description, response_status, response_body, proof, created_at` |

Behaviour the UI must respect:

- **Two identities are mandatory** for BOLA/BFLA (`requires_distinct_principals`).
  Without a victim the API answers **422 `Config Error: this test requires two
  distinct identities…`** — surface that message next to the field, not as a
  generic toast.
- **Victim auto-detection**: when `captured_auth_available` is true the owner
  credential is already sealed from the captured request and the victim field
  should read "auto-detected" (paste overrides it).
- **Suites fan out** into one job per applicable test type; `skipped[]` lists
  requested-but-inapplicable tests and should be shown, not swallowed.
- **Jobs are rate-limited** (1 per 30 s per target by default) so a suite can
  take minutes; the UI must show which jobs are running/queued rather than a
  single indeterminate spinner.
- Severity now ranges through **critical** (BOLA/IDOR, forged JWT) — the findings
  list must show it with the critical colour, not clamp at "high".

## Current structure

1. Mode tabs: **Suite Scan** / **Single Test**.
2. Target endpoint select (inventory).
3. Suite select + description card, or single-test select + description card.
4. "Auth Context (optional)" collapsible: Attacker Token (required for some
   tests), Victim Token (auto-detected), Attack Method (BFLA: DELETE/PUT/PATCH/POST).
5. Launch button.
6. Two panels: **Target Analysis** (endpoint + request headers) and **Scanner
   Output** ("Findings will appear here").

## Defect list (what "sloppy" decomposes into)

- **Hierarchy**: the config column is one undifferentiated stack of controls; the
  step from "choose what to attack" to "how to authenticate" to "run" is not
  visible. No section numbering, no visual grouping.
- **Spacing**: mixed `space-y-2`/`space-y-3`/`mt-3`/`pt-2` inside the same form;
  the submit button floats with an ad-hoc `pt-2`.
- **Labels**: "(required)"/"(optional)" appended inconsistently inside labels;
  placeholders carry instructions that vanish on typing; the auto-detected state
  is a placeholder string rather than an affordance.
- **States**: no loading skeleton for the endpoint/test lists; "Ready to Launch"
  persists during a run; failures render as a red box that keeps the previous
  run's text (stale-error confusion); no per-job progress for suites; no
  "skipped" display; results appear only at the very end.
- **Overflow**: the attacker-token textarea and the Target Analysis headers
  produce very long unbroken lines; JWT/fingerprint values have no copy action.
- **Consistency**: Target Analysis repeats the endpoint but the header dump is
  raw text, while the rest of the app renders structured cards (findings page
  pattern) — two visual languages on one screen.
- **Responsiveness**: the two panels stack acceptably, but the form column has no
  max width on ultrawide and the button row wraps awkwardly.

## Target design

- Four labelled steps in one card: **1 Target → 2 Test → 3 Auth → 4 Run**, each a
  bordered block with a one-line description; sticky "Launch" with the run state.
- Auth block: token inputs as monospace fields with a copy/paste affordance and
  helper text *below* the field; a small badge on the victim field —
  `auto-detected` (emerald) / `required` (amber) / `provided` (slate).
- Run state: a compact progress strip (job counter + per-status chips from
  `status_counts`) and an inline list of skipped tests with the reason.
- Findings: reuse the findings-page card (severity stripe, severity + test-type
  badges, title, evidence, expand for the raw response) instead of plain text.
- Empty state: an icon, one sentence ("Pick an endpoint and a suite, then
  launch"), and a link to Inventory; error state: the `ApiError` message plus a
  retry that reuses the same payload.
- Keep the current behaviour intact — do not change how scans are created; this
  is a presentation and state-model rewrite.

## Verifying a change here

`npx tsc --noEmit && bun run lint && bun run build`, then rebuild the dashboard
image (see SKILL.md) and exercise three flows at http://localhost:7000:
single test with an attacker token + auto victim (expect a finding), a test with
no identities (expect the 422 message surfaced), and a suite (expect progress and
skipped list).
