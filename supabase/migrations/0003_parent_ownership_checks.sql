-- FK checks bypass RLS, so require referenced parents to be visible (owned) to the caller on insert/update.
create or replace function public.owns_row(tbl regclass, row_id uuid) returns boolean
language plpgsql stable security invoker set search_path = public as $$
declare ok boolean;
begin
  if row_id is null then return true; end if;
  execute format('select exists (select 1 from %s where id = $1)', tbl) into ok using row_id;
  return ok;
end $$;

do $$
declare
  spec text[];
  specs text[][] := array[
    ['flowsheet_units','flowsheet_id','flowsheets'],
    ['flowsheet_streams','flowsheet_id','flowsheets'],
    ['flowsheet_streams','from_unit_id','flowsheet_units'],
    ['flowsheet_streams','to_unit_id','flowsheet_units'],
    ['simulation_runs','flowsheet_id','flowsheets'],
    ['simulation_runs','dataset_id','datasets'],
    ['simulation_runs','plant_data_id','plant_data'],
    ['plant_data','dataset_id','datasets'],
    ['simulation_results','run_id','simulation_runs'],
    ['ml_predictions','run_id','simulation_runs'],
    ['alerts','run_id','simulation_runs'],
    ['alerts','dataset_id','datasets']
  ];
  t text; cond text;
begin
  foreach t in array array['flowsheet_units','flowsheet_streams','simulation_runs','plant_data','simulation_results','ml_predictions','alerts'] loop
    cond := '(select auth.uid()) = owner_id';
    foreach spec slice 1 in array specs loop
      if spec[1] = t and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=spec[2]) then
        cond := cond || format(' and public.owns_row(%L::regclass, %I)', 'public.'||spec[3], spec[2]);
      end if;
    end loop;
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check (%s)', t, t, cond);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check (%s)', t, t, cond);
  end loop;
end $$;
