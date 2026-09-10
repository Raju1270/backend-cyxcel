# Peril likelihood carry-forward cron

Status: **implemented and scheduled, but read-only** — it reports what it would change without
writing anything. See "Enabling the real write" below.

## Problem

`PerilLikelihood` is a monthly snapshot table: the peril-likelihood Excel import stamps one row
per peril per month at `YYYY-MM-02`. If a peril goes a month without an Excel import or a Manage
Peril edit, it simply has no row for that month — there is no explicit "still rated at X" record.

The dashboard's month-over-month aggregate views (org-wide risk score, category rankings, the
"Latest Inherent Risk Ranking" bar chart) treat a missing row as risk score `0` for that peril,
not as "unchanged since last time." So if one peril is edited via Manage Peril in a month before
that month's bulk import has run, the dashboard can default-select that new month and show every
*other* peril at a false `0`, dragging the whole aggregate down. This cron exists so every active
peril always has a row for the current month — carrying its last known rating forward when
nothing new came in — so that failure mode can't happen.

## What it does today

1. Vercel Cron sends `GET /api/v1/cron/carry-forward-likelihoods` on the 1st of every month (see
   `vercel.json`'s `crons` entry), with `Authorization: Bearer <CRON_SECRET>`.
2. `CronAuthGuard` (`src/common/guards/cron-auth.guard.ts`) rejects the request unless that header
   matches the `CRON_SECRET` env var. This is the only thing standing between the route and the
   public internet, since Vercel Cron hits a plain HTTP path.
3. `CronService.previewCarryForwardLikelihoods()` (`src/modules/cron/cron.service.ts`):
   - Computes the canonical date for "this month" via `getCurrentMonthSnapshotDate()`
     (`src/common/utils/peril-likelihood-date.util.ts`) — `YYYY-MM-02` in UTC, the exact same
     convention the Excel import already uses and that the Manage Peril fix (see below) now also
     writes to.
   - Loads every non-deleted peril and, per peril, its most recent `PerilLikelihood` row
     (`distinct: ['perilId'], orderBy: { createdAt: 'desc' }`).
   - Classifies each peril into exactly one of:
     - **`alreadyUpToDate`** — already has a row for this month's canonical date. Nothing to do.
     - **`wouldCarryForward`** — has a prior rating, but not for this month. This is the list that
       matters: each entry carries the peril id/name, the date the last rating came from, and the
       EU/US/UK values that would be copied forward.
     - **`noPriorRating`** — never been rated at all (e.g. a brand-new peril awaiting its first
       rating). Correctly excluded rather than fabricating a value.
   - Logs a one-line summary and returns the full breakdown as JSON.

**No write call exists in this path.** No `.create(`, `.update(`, or `.upsert(` appears anywhere
in `cron.service.ts`. This was verified against production data directly: total `PerilLikelihood`
row count was identical before and after a live run of the exact query logic.

## Files

| File | Role |
|---|---|
| `vercel.json` | `crons` entry: `path: /api/v1/cron/carry-forward-likelihoods`, `schedule: 0 0 1 * *` (00:00 UTC, 1st of the month) — runs before the usual Excel-import cadence. |
| `src/modules/cron/cron.module.ts` | Wires the controller/service into `AppModule`. |
| `src/modules/cron/cron.controller.ts` | `@Controller('cron')`, guarded by `CronAuthGuard`, one route. |
| `src/modules/cron/cron.service.ts` | The read-only classification logic described above. |
| `src/common/guards/cron-auth.guard.ts` | Bearer-token check against `CRON_SECRET`. |
| `src/common/utils/peril-likelihood-date.util.ts` | Shared `getCurrentMonthSnapshotDate()` — also used by `PerilsService.update()`. |
| `src/config/validation.ts` / `configuration.ts` | Registers `CRON_SECRET` (required in production, same pattern as `CLERK_SECRET_KEY`). |

Note the route ends up at `/api/v1/...` because `main`'s bootstrap (`enableVersioning` in
`src/bootstrap/create-nest-app.ts`) applies a global `api/v` version prefix to every controller —
this isn't cron-specific, every existing endpoint (`/perils`, etc.) is versioned the same way.

## Deployment checklist

- [ ] Set `CRON_SECRET` in the Vercel project's environment variables (any long random string) —
      `validation.ts` will fail production boot if it's missing.
- [ ] Deploy to **production** — Vercel Cron only fires against production deployments, never
      preview/branch deployments.
- [ ] Confirm the cron registered: Vercel dashboard → project → Cron Jobs tab.
- [ ] After the first scheduled run, check the function logs for the `Carry-forward preview for
      <date>: {...}` summary line, or call the route manually with the bearer token to sanity-check
      the counts.

## Enabling the real write (not done yet, by design)

The endpoint was intentionally built read-only first so the classification logic could be
reviewed against real data across an actual month boundary before anything writes to production.
To turn it on, extend `previewCarryForwardLikelihoods()` (or add a sibling method) so that, for
each entry in `wouldCarryForward`:

1. `perilLikelihood.upsert({ where: { perilId_createdAt: { perilId, createdAt: snapshotDate } },
   create: { perilId, eu, us, uk, createdAt: snapshotDate }, update: { eu, us, uk } })` — upsert,
   not blind `create`, for the same reason `PerilsService.update()` was fixed to upsert: so this
   cron, a same-month Excel import, and a same-month Manage Peril edit can never each create their
   own separate row for one peril in one month.
2. **Do not** write a `PerilHistory` entry for a pure carry-forward — nothing actually changed, so
   snapshotting it as history would misrepresent it as a real edit and bloat that table with a
   duplicate entry every single month for every untouched peril. Only a genuine value change
   (Excel import or Manage Peril) should ever write history.
3. Keep skipping `noPriorRating` perils — never fabricate a first rating.
4. Consider batching the upserts (see `vercel-frontend-drm/scripts/peril-audit/shared.ts`'s
   `runWithConcurrency` for a pattern already used and verified in this codebase) rather than
   writing ~150+ rows one at a time in a single request — `maxDuration` is 300s, which is generous
   for this volume, but there's no reason not to parallelize.

## Related fix

`PerilsService.update()` (Manage Peril's backend) was fixed in the same effort to stop creating a
fresh `PerilLikelihood` row at the exact edit timestamp and instead upsert into this same
`YYYY-MM-02` canonical row, snapshotting `PerilHistory` only on the first edit of the month. This
cron and that fix share `getCurrentMonthSnapshotDate()` specifically so they can never disagree on
what "this month's row" means.
