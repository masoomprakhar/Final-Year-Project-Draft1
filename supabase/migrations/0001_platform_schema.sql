-- Simcourt platform schema (applied to project fvelnkrtyrelerdtglpu as "simcourt_platform_schema").
-- Owner-scoped tables, RLS, Storage bucket, realtime.

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'upload' check (source in ('sample','upload')),
  storage_path text,
  row_count integer not null default 0,
  status text not null default 'ready' check (status in ('ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index datasets_owner_created_idx on public.datasets (owner_id, created_at desc);

create table public.plant_data (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  recorded_at timestamptz not null,
  hot_flow double precision not null,
  hot_temperature double precision not null,
  hot_pressure double precision not null,
  cooling_flow double precision not null,
  cooling_temperature double precision not null,
  cooling_pressure double precision not null,
  composition double precision not null default 1,
  hot_outlet_spec double precision not null,
  hot_outlet_actual double precision not null,
  cold_outlet_actual double precision not null,
  hot_outlet_pressure_actual double precision not null,
  cold_outlet_pressure_actual double precision not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, recorded_at)
);
create index plant_data_owner_idx on public.plant_data (owner_id);

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete set null,
  plant_data_id uuid references public.plant_data(id) on delete set null,
  recorded_at timestamptz not null,
  mode text not null default 'simulation' check (mode in ('simulation','twin')),
  engine text not null default 'mock' check (engine in ('mock','dwsim')),
  status text not null default 'queued' check (status in ('queued','running','converged','failed','stopped')),
  equipment jsonb not null,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index simulation_runs_owner_created_idx on public.simulation_runs (owner_id, created_at desc);
create index simulation_runs_dataset_idx on public.simulation_runs (dataset_id);
create index simulation_runs_plant_data_idx on public.simulation_runs (plant_data_id);

create table public.simulation_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid not null unique references public.simulation_runs(id) on delete cascade,
  hot_outlet_temperature double precision,
  cold_outlet_temperature double precision,
  hot_outlet_pressure double precision,
  cold_outlet_pressure double precision,
  heat_duty double precision,
  lmtd double precision,
  reynolds_hot double precision,
  reynolds_cold double precision,
  pressure_drop_hot double precision,
  pressure_drop_cold double precision,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index simulation_results_owner_idx on public.simulation_results (owner_id);

create table public.ml_predictions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid not null unique references public.simulation_runs(id) on delete cascade,
  model_name text not null default 'demo-mock-model',
  model_version text not null default '0',
  is_demo boolean not null default true,
  hot_outlet_temperature double precision,
  cold_outlet_temperature double precision,
  heat_duty double precision,
  created_at timestamptz not null default now()
);
create index ml_predictions_owner_idx on public.ml_predictions (owner_id);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid references public.simulation_runs(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  recorded_at timestamptz not null,
  variable text not null,
  unit text not null,
  actual double precision not null,
  expected double precision not null,
  ml_prediction double precision,
  deviation double precision not null,
  severity text not null check (severity in ('WARNING','ANOMALY')),
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);
create index alerts_owner_created_idx on public.alerts (owner_id, created_at desc);
create index alerts_run_idx on public.alerts (run_id);
create index alerts_dataset_idx on public.alerts (dataset_id);

-- RLS: every row belongs to its owner. (select auth.uid()) is evaluated once per statement.
do $$
declare t text;
begin
  foreach t in array array['datasets','plant_data','simulation_runs','simulation_results','ml_predictions','alerts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;

-- Storage: private bucket for CSV uploads, files live under "<user id>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plant-csv', 'plant-csv', false, 2097152, array['text/csv','text/plain','application/vnd.ms-excel'])
on conflict (id) do nothing;

create policy "plant_csv_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'plant-csv' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "plant_csv_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'plant-csv' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "plant_csv_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'plant-csv' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Realtime for run status and monitoring alerts (RLS still filters what each user receives).
alter publication supabase_realtime add table public.simulation_runs;
alter publication supabase_realtime add table public.alerts;
