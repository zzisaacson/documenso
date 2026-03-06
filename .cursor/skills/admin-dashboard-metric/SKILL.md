---
name: admin-dashboard-metric
description: Add a new metric or chart to the admin stats page. Use when the user asks to add a metric, chart, or stat to the admin dashboard, or to display new data on the admin stats page.
---

# Adding a New Metric to the Admin Dashboard

The admin stats page lives at `apps/remix/app/routes/_authenticated+/admin+/stats.tsx`. Metrics are either **single-number cards** (CardMetric) or **charts** (Recharts in a shared card style). Follow the patterns below.

## Option A: Single-number metric (card)

Use when the metric is one value (e.g. total count, percentage).

1. **Data:** Add or reuse a fetcher in `packages/lib/server-only/admin/` that returns a number (or simple object). Example: `getUsersCount()` in `get-users-stats.ts`.
2. **Stats page:** In `stats.tsx`:
   - Add the fetcher to the `Promise.all` in the loader and to the returned object.
   - Destructure the value from `loaderData` in the component.
   - Render: `<CardMetric icon={LucideIcon} title={_(msg`Your Title`)} value={yourValue} />` in the appropriate grid (top row, or under "Document metrics" / "Recipients metrics").
3. **Translations:** Use `_(msg`Title here`)` for the title; ensure `useLingui` is used and `_` is from it.

Reference: existing cards in `stats.tsx` (e.g. Total Users, Total Documents) and `~/components/general/metric-card.tsx`.

## Option B: Chart metric (time series or breakdown)

Use when the metric is a series (e.g. by day, by month) or needs a visual chart.

### Step 1: Data fetcher

- **Location:** `packages/lib/server-only/admin/get-<name>.ts` (e.g. `get-daily-documents-created.ts`).
- **Export a result type** (e.g. `GetDailyDocumentsCreatedResult`) and an async function that returns it.
- Use `prisma.$queryRaw` for custom SQL or `prisma.*.groupBy` / `prisma.*.count` for simple aggregates. For time buckets, fill missing periods with 0 so the chart has a full range.
- Use `DateTime` from `luxon` for date formatting if needed.

### Step 2: Chart component

- **Location:** `apps/remix/app/components/general/admin-<name>-chart.tsx` (e.g. `admin-daily-documents-chart.tsx`).
- **Props:** Accept `title: string`, `data: YourResultType`, and optional `className`.
- **Styling:** Reuse the same card style as existing charts:
  - Wrapper: `<div className="border-border flex flex-1 flex-col justify-center rounded-2xl border p-6 pl-2">`
  - Title: `<div className="mb-6 flex px-4"><h3 className="text-lg font-semibold">{title}</h3></div>`
  - Chart: `ResponsiveContainer` (width 100%, height 400) wrapping Recharts `BarChart` (or similar) with `Bar`, `XAxis`, `YAxis`, `Tooltip`. Use `fill="hsl(var(--primary))"`, `radius={[4, 4, 0, 0]}`, `cursor={{ fill: 'hsl(var(--primary) / 10%)' }}` for consistency.
- **Recharts:** Import from `recharts` (Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis). For tooltips, a small custom tooltip component in a bordered white box is used (see `admin-daily-documents-chart.tsx`).
- **Data shape:** Map the fetcher result to whatever the chart needs (e.g. `label` for XAxis, `count` for Bar). Use `DateTime.fromFormat` (luxon) for date labels if needed.

### Step 3: Wire into the stats page

In `apps/remix/app/routes/_authenticated+/admin+/stats.tsx`:

1. **Loader:** Add your fetcher to the `Promise.all` array and add the returned value to the loader’s return object.
2. **Component:** Destructure the new value from `loaderData`.
3. **Charts section:** Inside the "Charts" grid (`<div className="mt-5 grid grid-cols-2 gap-8">`), render your chart component. Pass `title={_(msg`Your chart title`)}` and `data={yourData}`.
4. **Full-width chart:** Wrap in `<div className="col-span-2">` so the chart spans both columns.

### Step 4: Translations

Use `_(msg`Chart title here`)` for the chart title. No need to add entries to .po files for development; Lingui will extract on build.

## File reference

| Purpose | Example file |
|--------|---------------|
| Data fetcher | `packages/lib/server-only/admin/get-daily-documents-created.ts` |
| Chart component | `apps/remix/app/components/general/admin-daily-documents-chart.tsx` |
| Stats page (loader + UI) | `apps/remix/app/routes/_authenticated+/admin+/stats.tsx` |
| Card metric (single value) | `apps/remix/app/components/general/metric-card.tsx` |

## Conventions

- Admin data fetchers live under `packages/lib/server-only/admin/`. Name the file after the metric (e.g. `get-daily-documents-created.ts`).
- Chart components use the existing bordered card + Recharts pattern; keep `maxBarSize` or similar tuned so many bars (e.g. 30) fit (e.g. 24 for narrow bars).
- Use the **documenso-database** skill when writing SQL so table/column names and conventions are correct.
