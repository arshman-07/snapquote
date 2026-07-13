# Questions for a senior dev — Directus auth & scoping

Prepared 2026-07-13, while finishing Phase 2 auth. The two questions that
actually unblock the build are **#1 and #3**; **#4** is the big-picture one
worth an honest opinion. Paste his answers back into the project and they get
turned into a concrete implementation plan.

## Context (read this first)

Self-hosted **Directus 12 + Postgres** (Docker Compose) as the backend for a
React Native / Expo app. Launching to the public — everyday homeowners *and*
contractors, so **public sign-up**. Collections: `room_types`, `labour_rates`,
`quotes`, `quote_items`, plus users. I'm on a Directus plan where **"Use Custom"
permission filters (row-level, `$CURRENT_USER`) are paywalled** — I only have
All Access / No Access toggles per collection.

**The blocker I just found:** With public registration on and the App User
policy set to Read/Update `directus_users` at "All Access," a freshly registered
user can (proven via curl) read every user record including the admin's email
and role UUID, and **update any user's record including the admin's** — i.e.
near-certain privilege escalation to admin. Frontend query filters obviously
can't stop a raw API client.

**Licensing note (verified 2026-07-13):** the free **Core** tier gates SSO
*and* custom/row-level permission filters (`$CURRENT_USER`) behind paid **Team**
(~$50/seat/mo) / Enterprise. There's also an **Open Innovation Grant** (orgs
under $5M revenue, <50 employees → fully permissive access at no cost) that would
unlock both. Sources: directus.com/pricing, /docs/licensing/overview.

## Questions

1. **Per-user data scoping without paid row-level filters** — what's the
   standard pattern on Directus 12 when `$CURRENT_USER` filters aren't
   available? Is the answer a **custom extension/endpoint**, **Directus Flows**,
   a **DB view**, or do I actually need the paid tier for this to be safe? I
   need each user to only see their own quotes.

2. **The `directus_users` hole specifically** — with only All/No Access (no
   field- or row-level custom filters), can I make "a user can edit only their
   *own* profile, and only safe fields" work at all? Or should the client never
   touch `directus_users` and all profile writes go through a server-side
   hook/endpoint?

3. **Storing a `user_type` (contractor vs homeowner) at sign-up** — Directus's
   `/users/register` won't accept custom fields. Best pattern: a **Flow on
   user.create** that sets it, a **custom register endpoint**, a **separate
   profile collection**, or keep it off the user entirely? What would you do?

4. **Is self-hosted Directus even the right call for a public consumer app,** or
   is this a case where I should put a thin backend (Node/whatever) in front of
   Directus — or move to something with real row-level security (Supabase /
   Postgres RLS)? Honest take on whether I'm fighting the tool.

   **Related, and possibly the actual fork in the road:** the free **Core** tier
   gates *both* SSO *and* the row-level (`$CURRENT_USER`) permission filters
   behind the paid **Team** tier (~$50/seat/mo) / Enterprise. Directus also runs
   an **Open Innovation Grant** — orgs under $5M revenue and <50 employees get
   fully permissive access (SSO + custom filters) at no software cost, which
   would fix the account-takeover hole and quote-scoping cleanly. **Given that:
   apply for the grant, pay for Team, or put my own backend in front of
   Directus?**

5. **Auth token handling** — refresh token in `expo-secure-store`, access token
   in memory, SDK auto-refresh. Anything you'd change for a production mobile
   app?

6. **Transport** — the API is currently plain **HTTP over LAN / Tailscale**. For
   a public launch, minimum viable setup for HTTPS + not exposing the admin
   panel? (Reverse proxy + cert, Tailscale-only, etc.)

7. **General sanity check** — given public sign-up on self-hosted Directus, what
   are the top 2–3 things that will bite me that I haven't listed here? (rate
   limiting / abuse, backups, cost controls for the AI step later, etc.)

## His answers

_(paste replies here)_
