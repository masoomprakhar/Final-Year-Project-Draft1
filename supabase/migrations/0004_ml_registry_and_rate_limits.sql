-- Step 3: ML model registry (swap in real models later) and per-user rate limits.

create table public.ml_models (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  version text not null default '1',
  kind text not null default 'demo' check (kind in ('demo','http')),
  endpoint_url text,
  description text,
  is_active boolean not null default false,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (owner_id, name, version),
  check (kind = 'demo' or endpoint_url ~ '^https://')
);
create index ml_models_owner_idx on public.ml_models (owner_id);
create unique index ml_models_one_active_idx on public.ml_models (owner_id) where is_active;

alter table public.ml_models enable row level security;
create policy "ml_models_select_own" on public.ml_models for select to authenticated using ((select auth.uid()) = owner_id);
create policy "ml_models_insert_own" on public.ml_models for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "ml_models_update_own" on public.ml_models for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "ml_models_delete_own" on public.ml_models for delete to authenticated using ((select auth.uid()) = owner_id);

alter table public.ml_predictions add column model_id uuid references public.ml_models(id) on delete set null;
create index ml_predictions_model_idx on public.ml_predictions (model_id);

-- Rate limits: a trigger counts the caller's recent rows. Cheap, and holds for every client path
-- (browser, Edge Function, direct API) because it lives in the database.
create or replace function public.enforce_rate_limit() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  max_rows int := tg_argv[0]::int;
  window_seconds int := tg_argv[1]::int;
  recent int;
begin
  execute format('select count(*) from public.%I where owner_id = $1 and created_at > now() - make_interval(secs => $2)', tg_table_name)
    into recent using new.owner_id, window_seconds;
  if recent >= max_rows then
    raise exception 'Rate limit: at most % % rows per % seconds.', max_rows, tg_table_name, window_seconds using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger simulation_runs_rate_limit before insert on public.simulation_runs
  for each row execute function public.enforce_rate_limit(120, 60);
create trigger datasets_rate_limit before insert on public.datasets
  for each row execute function public.enforce_rate_limit(20, 600);
create trigger flowsheets_rate_limit before insert on public.flowsheets
  for each row execute function public.enforce_rate_limit(30, 600);
