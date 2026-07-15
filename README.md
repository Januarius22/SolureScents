# Solure Scents

Enterprise luxury fragrance commerce built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm run dev`.

The landing page can build without Supabase credentials. Configuration is validated when a Supabase client is first requested, providing a clear failure at the infrastructure boundary.

## Application boundaries

| Application | Route group | URL root | Layout ownership |
| --- | --- | --- | --- |
| Public Store | `(store)` | `/` | Store header and footer |
| Customer | `(account)` | `/account` | Customer dashboard shell and navigation |
| Admin | `(admin)` | `/admin` | Enterprise admin shell and navigation |
| Publisher | `(publisher)` | `/publisher` | Editorial shell and navigation |

Route groups organize the four experiences without appearing in URLs. The root layout contains only global fonts, metadata, styles, and providers; product-specific navigation never crosses an application boundary.

## Source organization

- `src/app`: routing and application layouts only
- `src/components`: shared brand, layout, provider, and UI primitives
- `src/config`: static application configuration
- `src/lib`: framework and infrastructure adapters
- `src/types`: cross-feature TypeScript contracts
- `src/validation`: Zod schemas at trust boundaries

Feature folders containing their own `actions`, `components`, `hooks`, `services`, `types`, and `validation` will be added with each domain. Empty placeholder folders are intentionally avoided.

## Quality commands

- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run build`

## Authentication and database

Phase 2 adds one shared authentication entrance with database-backed role routing:

- customers → `/account`
- publishers → `/publisher`
- operational staff, administrators, and super administrators → `/admin`

Protected routes are checked at the request boundary in `src/proxy.ts` and authorized again inside each server-rendered application layout. PostgreSQL RLS remains the final authorization boundary for data.

Database changes live in `supabase/migrations`. After authenticating the CLI, link the project and deploy pending migrations:

```bash
npx supabase login
npm run db:link -- --project-ref YOUR_PROJECT_REF
npm run db:push
```

See `docs/security-and-access.md` before creating the first administrator or changing role grants.
