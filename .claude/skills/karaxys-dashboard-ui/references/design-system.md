# Karaxys dashboard design system

Facts gathered from `app/globals.css`, `components/ui/*` and the existing
`app/dashboard/*` pages. When something here disagrees with the code, the code
wins — update this file in the same change.

## 1. Palette (dark theme, oklch)

The app is dark-only in practice (`next-themes` is present but the console is
designed for dark). Semantic tokens come from `globals.css`:

| Token | Dark value | Use |
|---|---|---|
| `--background` | `oklch(0.15 0.02 260)` | page background |
| `--card` / `--popover` | `oklch(0.19 0.025 260)` | panels, cards, menus |
| `--foreground` | `oklch(0.984 0.003 247.858)` | primary text |
| `--muted-foreground` | `oklch(0.704 0.04 256.788)` | secondary/help text |
| `--primary` | `oklch(0.77 0.16 72)` | brand gold, focus ring, primary actions |
| `--secondary` / `--accent` | `oklch(0.25…)` / `oklch(0.24…)` | subtle fills, hovers |
| `--destructive` | `oklch(0.704 0.191 22.216)` | destructive actions |
| `--border` | `oklch(1 0 0 / 10%)` | all borders (white at 10%) |
| `--input` | `oklch(1 0 0 / 15%)` | input outlines |
| `--radius` | `0.5rem` | base radius; `radius-lg`=base, `md`=−2px, `xl`=+4px |

**Class conventions actually used in the pages**

- Panel: `<Card className="border-white/5 bg-black/20">`; heavier insets use
  `bg-black/30 border-white/10`.
- Inputs: `className="h-10 bg-black/30 border-white/10 text-slate-200"`.
- Help text: `text-xs text-muted-foreground` (or `text-[11px] leading-relaxed`).
- Section eyebrow: `text-xs font-semibold uppercase tracking-wider text-slate-500`.
- Primary button: `h-11 px-6 bg-linear-to-r from-rose-600 to-rose-500 …` on the
  scanner; `Button` defaults elsewhere. Keep the page's own action colour.
- Never mix `text-slate-*` and `text-muted-foreground` for the same role on one
  screen.

## 2. Status colours (copy these, they are the house style)

Severity:

```
critical  bg-rose-500/15    text-rose-400    border-rose-500/30
high      bg-orange-500/15  text-orange-400  border-orange-500/30
medium    bg-amber-500/15   text-amber-400   border-amber-500/30
low       bg-emerald-500/15 text-emerald-400 border-emerald-500/30
default   bg-slate-500/15   text-slate-400   border-slate-500/30
```

HTTP method:

```
GET     text-blue-400    bg-blue-500/10    border-blue-500/20
POST    text-emerald-400 bg-emerald-500/10 border-emerald-500/20
PUT     text-amber-400   bg-amber-500/10   border-amber-500/20
DELETE  text-rose-400    bg-rose-500/10    border-rose-500/20
PATCH   text-purple-400  bg-purple-500/10  border-purple-500/20
default text-slate-400   bg-slate-500/10   border-slate-500/20
```

Test-type chip: `bg-purple-500/10 text-purple-400 border-purple-500/20`.
Run status: queued/running = amber or blue, completed = emerald,
failed/timed_out = rose, cancelled = slate.

## 3. Component inventory (`components/ui/`)

`Alert, Avatar, Badge, Breadcrumb, Button, Card, Chart, Collapsible,
DropdownMenu, Input, Label, ScrollArea, Select, Separator, Sheet, Sidebar,
Skeleton, Table, Tabs, Textarea, Tooltip`.

Rules:
- `Card` + `CardHeader/CardTitle/CardDescription/CardContent` for every panel;
  findings use a `border-l-4` severity stripe (`${severityBorder}`).
- `Badge variant="outline"` for chips/metrics, with `text-xs shrink-0`.
- `Table` for tabular data (results/jobs), `ScrollArea` when a panel scrolls.
- `Collapsible` for advanced/optional blocks (Auth Context, request headers).
- `Sheet` for the Quick Start drawer; `Tabs` for mode switches.
- `Skeleton` for loading; never a bare spinner in a panel.
- Icons: `lucide-react` at `size-4` inline with `gap-2` text; `size-3.5` for
  eyebrow labels.

## 4. Page shell and rhythm

```
app/dashboard/layout.tsx
  Protected → DashboardShell (QuickStartProvider + SidebarProvider)
    AppSidebar (components/sidebar.tsx) + SidebarInset {children}
```

- Page root: `space-y-6` sections; each section is a `Card`.
- Inner padding: `p-4` for list rows, `p-6`/`p-8` for form panels.
- Grid: two-column layouts use `grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]`
  style splits; collapse to one column below `lg`.
- Truncation: monospace identifiers get `truncate` or `break-all` plus a copy
  button; a page-level horizontal scrollbar is a bug.
- Focus: rely on `--ring` (`focus-visible:ring-ring/50`); do not remove outlines.

## 5. Charts

`components/ui/chart.tsx` wraps recharts with `ChartContainer` +
`ChartTooltip`/`ChartTooltipContent`. See `components/dashboard/security-charts.tsx`
for the house pattern (severity distribution, 7-day trend). Charts are dark,
gridless or `stroke-white/5`, series colours from `--chart-*`, and always have a
labelled empty state rather than an empty axis frame.

## 6. Common mistakes to avoid

- A spinner/`Loading…` string instead of a skeleton shaped like the content.
- Raw `text-white`/`text-gray-400` instead of `text-slate-*`/`muted-foreground`.
- New border radii or shadows that no other panel uses.
- Instructions in placeholders (disappear on typing) instead of helper text.
- Buttons that stay enabled while a request is in flight.
- Panels that grow to fit a 700-character JWT and break the layout.
- Adding a dependency for something a primitive already does.
