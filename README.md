# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Civic Radar Data Sources

Civic Radar loads public federal and local civic activity through
`app/api/civic/route.ts`.

Federal data works without configuration through Congress.gov RSS, GovInfo RSS,
and the Federal Register API. For richer congressional data, create a
Congress.gov API key through api.data.gov, then set:

```bash
CONGRESS_GOV_API_KEY=your_key_here
```

When configured, the app adds Congress.gov API feeds for latest bills, latest
bill actions, and committee meetings/hearings. Local meeting data comes from
public Legistar calendars for the jurisdictions listed in the API route.

The dynamic `/api/civic` route supports local-source selection with `lat`, `lng`,
`q`, `limit`, and `all=1` query parameters. The dashboard uses location when
available, search text when provided, and otherwise loads a representative
default set. GitHub Pages publishes a static broad snapshot because Pages cannot
run the dynamic API route per visitor.

### Supabase Cache

External source responses are cached in memory by default. To make that cache
persistent across serverless/edge instances and deployments, create the table in
`supabase/civic-cache.sql`, then set these runtime secrets:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Set `SUPABASE_CACHE_ENABLED=false` to disable Supabase while keeping the
in-memory fallback.

The same SQL file also creates the Civic Agent rollout tables for accounts,
watchlists, private context, alert matches, policy briefs, advocacy drafts,
anonymous preference signals, and thresholded public/candidate aggregates. Re-run
the file in the Supabase SQL editor whenever the schema changes.

For browser account features, expose only the public Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
```

The service-role key must stay server-side. The public GitHub Pages build can
also set `window.__SUPABASE_URL__` and `window.__SUPABASE_ANON_KEY__` in
`github-pages/index.html`.

## Civic Agent Rollout

The dashboard includes a Supabase-backed resident civic-aid workspace:

- Accounts through Supabase Auth.
- Region, jurisdiction, topic, bill keyword, agency, committee, and local-body
  watchlists.
- Current alert matching against loaded federal and local civic events.
- Private user goals, concerns, life context, notification preferences, and
  consent flags protected by row-level security.
- Evidence-bound civic briefs with confidence states and citations back to
  official sources.
- Consent-gated comment, email, testimony, and call-script drafts.
- Anonymous support/oppose/unsure feedback with priority intensity and
  affectedness.
- Thresholded aggregate RPCs for event-level and candidate/public topic queries.
- A public methodology page that states Civic Radar is not yet a Coasean
  bargaining system.

Candidate-facing aggregate queries return counts only after the configured
minimum threshold is met. Private life context is never exposed through these
aggregate functions.

### Normalized Events and Edge Functions

The SQL file also defines normalized civic-aid tables:

- `civic_events` and `civic_event_sources` store normalized public items.
- `civic_event_relevance_scores` records why an item matched a resident.
- `civic_notifications` stores in-app and email notification state.
- `civic_user_feedback` captures position, intensity, affectedness, reason, and
  desired outcome.
- `civic_event_outcomes` and `civic_explanation_audits` support outcome tracking
  and source-grounded explanation review.

Supabase Edge Function source lives under `supabase/functions/`:

- `sync-civic-events`: ingest the public snapshot into normalized event rows.
- `match-civic-alerts`: match events to user watchlists server-side.
- `send-civic-digest`: send email via Resend when `RESEND_API_KEY` is set, or
  leave in-app notifications queued when it is not.
- `generate-civic-brief`: return a deterministic source-bounded brief and write
  an audit row.

The GitHub Pages workflow invokes `sync-civic-events`, `match-civic-alerts`, and
`send-civic-digest` after each push/scheduled deploy, so the six-hour Pages
schedule also refreshes normalized events and in-app/email notification state.

Set these function secrets before enabling scheduled production runs:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npx supabase secrets set CIVIC_RADAR_FEED_URL=https://perrinmyerson.github.io/civic-radar/civic-data.json
npx supabase secrets set RESEND_API_KEY=your_resend_key
npx supabase secrets set CIVIC_RADAR_FROM_EMAIL="Civic Radar <alerts@your-domain.example>"
```

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
