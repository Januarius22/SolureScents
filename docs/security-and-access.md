# Security and access operations

## Authorization model

Roles and permissions are relational rather than hard-coded into profile rows. A profile can hold multiple time-bounded roles, and each role can hold multiple permissions. This permits future custom staff roles without changing the user table.

Browser routing is not an authorization boundary. Security is enforced in three layers:

1. `src/proxy.ts` refreshes the session and rejects anonymous protected requests.
2. Each application layout loads verified user data and enforces the assigned application area on the server.
3. PostgreSQL RLS and permission functions protect every exposed identity table and storage operation.

## First super administrator

The first privileged role must be granted manually after its user has registered and confirmed their email. Run the following in the Supabase SQL Editor while signed in as the project owner, replacing the email value:

```sql
insert into public.profile_roles (profile_id, role_id)
select u.id, r.id
from auth.users u
cross join public.roles r
where lower(u.email) = lower('owner@example.com')
  and r.slug = 'super_admin'
on conflict (profile_id, role_id) do nothing;
```

Subsequent staff role assignment must occur through an authenticated server operation guarded by `users.manage`. The admin user-management interface will be built with the admin domain.

## Hosted Supabase settings

After deploying the migration, verify these Dashboard settings because local `config.toml` does not change hosted Auth configuration:

- Site URL matches `NEXT_PUBLIC_SITE_URL`.
- Redirect allow-list includes `NEXT_PUBLIC_SITE_URL/auth/callback`.
- Email confirmation is enabled.
- Minimum password length is 10 and requires uppercase, lowercase, and digits.
- Secure password changes and refresh-token rotation are enabled.
- SMTP is configured before production launch.

## Storage

- `avatars`: public reads; authenticated users may mutate only files inside their own UUID folder.
- `editorial-media`: public reads; mutations require `media.manage`.
- File size and MIME-type restrictions are enforced at the bucket level.

Never expose the service-role key to the browser or store it in a `NEXT_PUBLIC_` variable.
