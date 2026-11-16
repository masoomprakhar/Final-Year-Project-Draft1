-- Step 2: editable flowsheets (units, streams, connections) and flowsheet runs.

create table public.flowsheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index flowsheets_owner_idx on public.flowsheets (owner_id, created_at desc);

create table public.flowsheet_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flowsheet_id uuid not null references public.flowsheets(id) on delete cascade,
  tag text not null,
  unit_type text not null check (unit_type in
    ('heater','cooler','mixer','splitter','reactor','column','compressor','valve','flash','separator','pump','exchanger')),
  x double precision not null default 0,
  y double precision not null default 0,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (flowsheet_id, tag)
);
create index flowsheet_units_flowsheet_idx on public.flowsheet_units (flowsheet_id);

-- A stream is the connection: it leaves one unit port and enters another. A null end means a
-- free feed (no from_unit_id) or a product (no to_unit_id). Feed streams carry their own conditions.
create table public.flowsheet_streams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flowsheet_id uuid not null references public.flowsheets(id) on delete cascade,
  tag text not null,
  from_unit_id uuid references public.flowsheet_units(id) on delete set null,
  from_port integer not null default 0 check (from_port >= 0),
  to_unit_id uuid references public.flowsheet_units(id) on delete set null,
  to_port integer not null default 0 check (to_port >= 0),
  flow double precision not null default 40,
  temperature double precision not null default 35,
  pressure double precision not null default 2,
  created_at timestamptz not null default now(),
  unique (flowsheet_id, tag)
);
create index flowsheet_streams_flowsheet_idx on public.flowsheet_streams (flowsheet_id);
create index flowsheet_streams_from_idx on public.flowsheet_streams (from_unit_id);
create index flowsheet_streams_to_idx on public.flowsheet_streams (to_unit_id);

alter table public.simulation_runs
  add column flowsheet_id uuid references public.flowsheets(id) on delete set null,
  add column scope text not null default 'plant_row' check (scope in ('plant_row','flowsheet'));
create index simulation_runs_flowsheet_idx on public.simulation_runs (flowsheet_id);

do $$
declare t text;
begin
  foreach t in array array['flowsheets','flowsheet_units','flowsheet_streams']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;
