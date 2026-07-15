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

Authentication, authorization, middleware/proxy enforcement, database migrations, RLS policies, and storage rules belong to Phase 2 and must be implemented together so no route is protected only in the browser.
