-- 기존 supabase-team-share.sql을 실행한 뒤 한 번만 실행하세요.
-- 팀별 "현재 작전" 1건을 저장하고, 두 기기에 실시간 변경을 전달합니다.

create table if not exists public.team_operations (
  team_id uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_operations enable row level security;

grant select, insert, update on public.team_operations to authenticated;

drop policy if exists "Team members can read current operation" on public.team_operations;
create policy "Team members can read current operation"
on public.team_operations
for select
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_operations.team_id
      and tm.user_id = (select auth.uid())
  )
);

drop policy if exists "Team members can create current operation" on public.team_operations;
create policy "Team members can create current operation"
on public.team_operations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_operations.team_id
      and tm.user_id = (select auth.uid())
  )
);

drop policy if exists "Team members can update current operation" on public.team_operations;
create policy "Team members can update current operation"
on public.team_operations
for update
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_operations.team_id
      and tm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_operations.team_id
      and tm.user_id = (select auth.uid())
  )
);

create or replace function public.set_team_operations_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_team_operations_updated_at on public.team_operations;
create trigger set_team_operations_updated_at
before update on public.team_operations
for each row
execute function public.set_team_operations_updated_at();

-- Postgres Changes를 이 작은 팀 상태 테이블에만 켭니다.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_operations'
    ) then
    execute 'alter publication supabase_realtime add table public.team_operations';
  end if;
end;
$$;
