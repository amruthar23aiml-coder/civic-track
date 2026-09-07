create type public.event_category as enum (
  'community_cleanup','tree_plantation','food_donation','clothes_donation','book_donation',
  'school_supplies_donation','fundraising_campaign','blood_donation_camp','medical_checkup_camp',
  'medicine_donation','toy_donation','blanket_donation','disaster_relief','old_age_home_visit',
  'animal_shelter_support','educational_tutoring','women_empowerment','skill_development',
  'environmental_awareness','recycling_ewaste','charity_marathon','other'
);

alter table public.events
  add column category public.event_category not null default 'community_cleanup',
  add column category_other text,
  add column details jsonb not null default '{}'::jsonb,
  add column landmark text,
  add column contact_name text,
  add column contact_phone text,
  add column approved boolean not null default true;

alter table public.registrations add column hours numeric not null default 0;

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  donor_id uuid references auth.users(id) on delete set null,
  donor_name text not null default 'Anonymous',
  amount numeric not null default 0,
  message text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.donations to anon;
grant select, insert, update, delete on public.donations to authenticated;
grant all on public.donations to service_role;
alter table public.donations enable row level security;
create policy donations_read on public.donations for select using (true);
create policy donations_insert_self on public.donations for insert to authenticated with check (auth.uid() = donor_id);
create policy donations_manage on public.donations for update to authenticated
  using (auth.uid() = donor_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = donor_id or public.has_role(auth.uid(), 'admin'));
create policy donations_delete on public.donations for delete to authenticated
  using (auth.uid() = donor_id or public.has_role(auth.uid(), 'admin'));

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.announcements to anon;
grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select using (true);
create policy announcements_insert on public.announcements for insert to authenticated
  with check (auth.uid() = author_id and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'organizer')));
create policy announcements_update on public.announcements for update to authenticated
  using (auth.uid() = author_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = author_id or public.has_role(auth.uid(), 'admin'));
create policy announcements_delete on public.announcements for delete to authenticated
  using (auth.uid() = author_id or public.has_role(auth.uid(), 'admin'));

alter table public.registrations drop constraint registrations_event_id_fkey,
  add constraint registrations_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
alter table public.event_photos drop constraint event_photos_event_id_fkey,
  add constraint event_photos_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
alter table public.waste_logs drop constraint waste_logs_event_id_fkey,
  add constraint waste_logs_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;

create policy event_photos_update on public.event_photos for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));