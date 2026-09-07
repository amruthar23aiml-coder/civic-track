-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin', 'organizer', 'volunteer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_read_own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_manage" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- new user bootstrap
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'volunteer') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- EVENTS --------------------------------------------------------------
create type public.event_status as enum ('upcoming', 'completed', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  capacity integer not null default 20,
  cover_url text,
  status public.event_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant select on public.events to anon;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "events_public_read" on public.events for select using (true);
create policy "events_insert_organizer" on public.events for insert to authenticated
  with check (auth.uid() = organizer_id and (public.has_role(auth.uid(), 'organizer') or public.has_role(auth.uid(), 'admin')));
create policy "events_update_own" on public.events for update to authenticated
  using (auth.uid() = organizer_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = organizer_id or public.has_role(auth.uid(), 'admin'));
create policy "events_delete_own" on public.events for delete to authenticated
  using (auth.uid() = organizer_id or public.has_role(auth.uid(), 'admin'));
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create index events_starts_at_idx on public.events (starts_at);

create or replace function public.is_event_organizer(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events e where e.id = _event_id and e.organizer_id = _user_id)
$$;

-- REGISTRATIONS -------------------------------------------------------
create type public.attendance_status as enum ('pending', 'attended', 'absent');

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  volunteer_id uuid not null references auth.users(id) on delete cascade,
  attendance public.attendance_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (event_id, volunteer_id)
);
grant select, insert, update, delete on public.registrations to authenticated;
grant select on public.registrations to anon;
grant all on public.registrations to service_role;
alter table public.registrations enable row level security;
create policy "registrations_read" on public.registrations for select using (true);
create policy "registrations_insert_self" on public.registrations for insert to authenticated
  with check (auth.uid() = volunteer_id);
create policy "registrations_update" on public.registrations for update to authenticated
  using (auth.uid() = volunteer_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = volunteer_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));
create policy "registrations_delete" on public.registrations for delete to authenticated
  using (auth.uid() = volunteer_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));

-- WASTE LOGS ----------------------------------------------------------
create table public.waste_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(10,2) not null default 0,
  bags integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.waste_logs to authenticated;
grant select on public.waste_logs to anon;
grant all on public.waste_logs to service_role;
alter table public.waste_logs enable row level security;
create policy "waste_logs_read" on public.waste_logs for select using (true);
create policy "waste_logs_insert_self" on public.waste_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "waste_logs_update" on public.waste_logs for update to authenticated
  using (auth.uid() = user_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));
create policy "waste_logs_delete" on public.waste_logs for delete to authenticated
  using (auth.uid() = user_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));

-- PHOTOS --------------------------------------------------------------
create type public.photo_kind as enum ('before', 'after');

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.photo_kind not null,
  url text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.event_photos to authenticated;
grant select on public.event_photos to anon;
grant all on public.event_photos to service_role;
alter table public.event_photos enable row level security;
create policy "event_photos_read" on public.event_photos for select using (true);
create policy "event_photos_insert_self" on public.event_photos for insert to authenticated with check (auth.uid() = user_id);
create policy "event_photos_delete" on public.event_photos for delete to authenticated
  using (auth.uid() = user_id or public.is_event_organizer(event_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));

-- LEADERBOARD ---------------------------------------------------------
create or replace function public.leaderboard(_limit integer default 50)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  events_attended bigint,
  total_weight_kg numeric,
  total_bags bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.city,
    coalesce(a.attended, 0)::bigint,
    coalesce(w.weight, 0)::numeric,
    coalesce(w.bags, 0)::bigint
  from public.profiles p
  left join (
    select volunteer_id, count(*) as attended
    from public.registrations where attendance = 'attended'
    group by volunteer_id
  ) a on a.volunteer_id = p.id
  left join (
    select user_id, sum(weight_kg) as weight, sum(bags) as bags
    from public.waste_logs group by user_id
  ) w on w.user_id = p.id
  where coalesce(a.attended, 0) > 0 or coalesce(w.weight, 0) > 0
  order by coalesce(a.attended,0) desc, coalesce(w.weight,0) desc
  limit greatest(1, least(_limit, 200));
$$;
grant execute on function public.leaderboard(integer) to anon, authenticated;

create or replace function public.platform_stats()
returns table (
  total_events bigint,
  total_volunteers bigint,
  total_registrations bigint,
  total_weight_kg numeric,
  total_bags bigint,
  attended_count bigint
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.events),
    (select count(*) from public.profiles),
    (select count(*) from public.registrations),
    (select coalesce(sum(weight_kg),0) from public.waste_logs),
    (select coalesce(sum(bags),0)::bigint from public.waste_logs),
    (select count(*) from public.registrations where attendance = 'attended');
$$;
grant execute on function public.platform_stats() to anon, authenticated;
