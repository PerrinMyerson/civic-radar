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
