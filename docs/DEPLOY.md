# Deploying Simcourt (Vercel + Supabase)

The app is a static Next.js 15 build. All server logic is in Supabase (Postgres, Auth, Storage,
Edge Functions), so Vercel only serves the front end.

## 1. Supabase (once)

Migrations 0001–0004 in `supabase/migrations/` are already applied to project `fvelnkrtyrelerdtglpu`.
For a fresh project run them in order (`npx supabase db push`).

1. **Auth → Providers → Email:** keep email + password on. Turn on *Leaked password protection*.
2. **Auth → URL Configuration:** set *Site URL* to your Vercel URL and add it (and any preview domains) to *Redirect URLs*.
3. **Edge Functions:** deploy all three from your machine (the CLI bundles `_shared/` for you):
   ```bash
   npx supabase login
   npx supabase functions deploy twin-api       --project-ref fvelnkrtyrelerdtglpu
   npx supabase functions deploy flowsheet-api  --project-ref fvelnkrtyrelerdtglpu
   ```
   Optional, to score runs with a real model: `npx supabase secrets set ML_API_URL=https://… ML_MODEL_NAME=my-model`
   and `DWSIM_API_URL=https://…` to use a DWSIM service for the heat exchanger.
4. After editing anything in `lib/` that the functions share, run `npm run sync:edge` and redeploy (CI fails if they drift).

## 2. Vercel

1. Import the GitHub repo (framework: Next.js, defaults are right).
2. Environment variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fvelnkrtyrelerdtglpu.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon / publishable key (Supabase → Project Settings → API) |

   Never add the `service_role` key anywhere in Vercel; nothing in this app uses it.
3. Deploy. Without these variables the app still runs, local-only, with no sign-in.

## 3. Post-deploy checklist

- [ ] Sign up on the live URL, confirm the email if confirmation is on.
- [ ] Workbench loads the sample dataset; Datasets page lists it.
- [ ] File → Generate Demo Runs & Alerts; Runs and Monitoring pages fill in.
- [ ] "+" tab → new flowsheet → add units → Connect → Run Simulation; the Runs page shows a *Flowsheet* run.
- [ ] ML Models page lists `demo-mock-model` as Active.
- [ ] Revoke any Supabase access tokens you ever pasted in chat.

## Limits in place

Per user, enforced in Postgres: 120 runs/minute, 20 datasets/10 minutes, 30 flowsheets/10 minutes.
Edit `0004_ml_registry_and_rate_limits.sql` (the `enforce_rate_limit(max, seconds)` arguments) to change them.
