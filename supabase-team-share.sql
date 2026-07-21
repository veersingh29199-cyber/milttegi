create table if not exists public.team_members (
  team_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.shared_trips (
  team_id uuid not null,
  id text not null,
  payload jsonb,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (team_id, id)
);

alter table public.team_members enable row level security;
alter table public.shared_trips enable row level security;

create policy "Users can see their team memberships"
on public.team_members
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can join a team when they know the team code"
on public.team_members
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Team members can read shared trips"
on public.shared_trips
for select
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = shared_trips.team_id
      and tm.user_id = (select auth.uid())
  )
);

create policy "Team members can add shared trips"
on public.shared_trips
for insert
to authenticated
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = shared_trips.team_id
      and tm.user_id = (select auth.uid())
  )
);

create policy "Team members can update shared trips"
on public.shared_trips
for update
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = shared_trips.team_id
      and tm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = shared_trips.team_id
      and tm.user_id = (select auth.uid())
  )
);

create or replace function public.set_shared_trips_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shared_trips_updated_at on public.shared_trips;
create trigger set_shared_trips_updated_at
before update on public.shared_trips
for each row
execute function public.set_shared_trips_updated_at();

