---
name: karaxys-dashboard-ui
description: >-
  Frontend and UI work on the Karaxys dashboard (the Next.js app in the
  `dashboard` repo): redesigning pages, fixing spacing/contrast/typography,
  building or polishing components, wiring API calls, and reviewing the visual
  quality of any screen. Use this skill whenever a task touches the dashboard's
  UI — "the scan page looks sloppy", "clean up the sidebar", "make this page
  match the rest of the app", "add a filter to findings", "the empty states are
  bad", "polish this table", "the layout breaks on small screens" — even when
  the user does not say "design" or name a file. Also use it before adding any
  new page or component so the result matches the existing system. Do not use it
  for backend/API/scanner work.
---

# Karaxys dashboard UI

The dashboard is the operator-facing app for Karaxys: inventory, vulnerabilities,
findings, scan jobs and the Active Scanner. It is a dark, dense
security-console UI. The bar for a change is: it must look deliberate — aligned
to the existing tokens and spacing — and it must handle loading, empty, error
and overflow states, because an operator stares at this screen for hours.

## Stack and layout (verify, don't assume)

- Next.js 16 App Router + React 19, TypeScript strict, Tailwind v4
  (`@tailwindcss/postcss`, no `tailwind.config.js`), shadcn-style primitives in
  `components/ui/` (built on `radix-ui`), `lucide-react` icons, `recharts`
  charts, `next-themes`, `class-variance-authority`, `clsx` + `tailwind-merge`
  exposed as `cn()` in `lib/utils.ts`.
- Authenticated pages live under `app/dashboard/*`; the shell is
  `app/dashboard/layout.tsx` → `AppSidebar` (`components/sidebar.tsx`) +
  `SidebarInset`. Auth pages are `app/(auth)/*`; marketing/blog under `app/blog`,
  docs under `app/docs`.
- Data access is `apiFetch` from `lib/api.ts` (in-memory access token, one silent
  refresh + retry on 401, throws `ApiError`). Base URL resolution is in
  `lib/config.ts`. Never call `fetch` directly for API data.
- Package manager is **bun** (`bun install`, `bun.lock` is authoritative;
  `package-lock.json` is stale and unused). Dev server: `bun run dev` on port
  7000.

## Non-negotiables

1. **Verify before claiming done**: `npx tsc --noEmit`, `bun run lint` (must be
   **0 errors**; warnings from the react-hooks v6 rules are expected and fine),
   and `bun run build`. A UI change that breaks the build is not done.
2. **Reuse the primitives.** If a control exists in `components/ui/`, use it
   (`Button`, `Input`, `Textarea`, `Select`, `Label`, `Card`, `Badge`, `Table`,
   `Tabs`, `Collapsible`, `Sheet`, `Skeleton`, `Tooltip`, `Alert`, `Separator`,
   `ScrollArea`, `DropdownMenu`, `Breadcrumb`). Do not hand-roll a control that
   already exists, and do not add a dependency without checking whether a
   primitive already covers it.
3. **Every async view handles four states**: loading (a `Skeleton` shaped like
   the content, not a spinner in the middle of nowhere), empty (an icon + one
   sentence + the action that fixes it), error (the `ApiError` message and a
   retry), and populated. Missing states are the most common "sloppy" complaint.
4. **No new lint errors.** `react-hooks/set-state-in-effect` and
   `react-hooks/refs` are configured as warnings in `eslint.config.mjs`; do not
   reintroduce them as errors, and prefer restructuring over suppressing when a
   warning points at a real cascade.
5. **Keep the dark theme coherent.** Use semantic tokens
   (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`) first;
   the de-facto codebase style adds translucent overlays
   (`bg-black/30`, `border-white/10`) for insets. Pick the local page's
   convention and stay consistent within the page. Details and the exact palette
   are in `references/design-system.md`.

## The known-sloppy area: the Active Scanner page

`app/dashboard/scan/page.tsx` is the page the user calls sloppy. Treat it as the
reference for the quality bar and expect to rework it, not patch it:

- The form is one dense column mixing mode tabs, endpoint/test selectors, an
  "Auth Context" collapsible and a submit button with no visual rhythm — group
  it (Target → Test → Auth → Run) with a consistent spacing scale.
- Labels are inconsistent: some fields have inline "(required)"/"(optional)"
  text, some rely on the placeholder; the victim-token field shows
  "auto-detected" state that is easy to miss. Make required/auto state
  unambiguous and put the explanation next to the field, not below a divider.
- Placeholders carry instructions instead of help text (e.g. "must belong to a
  DIFFERENT user than the attacker token"). Move that to helper text under the
  input so it survives typing.
- Results render as raw text blocks; findings should use the same
  severity badge + card + evidence layout as `app/dashboard/findings/page.tsx`.
- Long values (JWTs, URLs, fingerprints) overflow: monospace with
  `truncate`/`break-all` and a copy button, never a horizontal scrollbar on the
  page.
- No loading/empty/error treatment: the panel says "Ready to Launch" forever
  until results appear.

Read `references/scan-page.md` before touching it (structure, API fields and
current problems).

## Working method

1. Read the page and its neighbours first — the best design decision is usually
   "make this page use the pattern the findings/jobs pages already use".
2. Write down the concrete defects before editing (alignment, hierarchy,
   missing states, overflow, inconsistent tokens). The user's word "sloppy"
   almost always decomposes into those five classes.
3. Make the change in a focused edit; do not restyle unrelated pages in the same
   pass.
4. Verify with the three commands above; then rebuild and look at it:

   ```bash
   cd /home/prateek/Documents/projects/karaxys-core/deploy
   docker compose --env-file .env -f compose/dev/docker-compose.yml build dashboard
   docker compose --env-file .env -f compose/dev/docker-compose.yml up -d dashboard
   # then open http://localhost:7000
   ```

   The dev stack's dashboard container serves the built image, so a change is
   only visible after that rebuild.
5. Report what changed and what the user should look at, not just "done".

## References

- `references/design-system.md` — token palette, class conventions, component
  inventory, page shell, colour usage for severity/method/status, chart rules.
- `references/scan-page.md` — the Active Scanner page: structure, API contract,
  defect list, target design.
