-- ============================================================
-- CIVICTRACK GARBAGE REPORTING SYSTEM
-- ============================================================

-- REPORT STATUS
create type public.report_status as enum (
  'submitted',
  'verified',
  'assigned',
  'in_progress',
  'completed',
  'rejected'
);

-- REPORT CATEGORY
create type public.report_category as enum (
  'garbage',
  'plastic',
  'construction_waste',
  'overflowing_bin',
  'illegal_dumping',
  'other'
);

-- ============================================================
-- REPORTS
-- ============================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),

  -- Citizen who created the report
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Report information
  title text not null default 'Garbage Report',
  description text not null default '',
  category public.report_category not null default 'garbage',

  -- Location
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,

  -- Uploaded images
  before_image_url text,
  after_image_url text,

  -- Authority workflow
  status public.report_status not null default 'submitted',
  assigned_authority_id uuid references auth.users(id) on delete set null,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================
-- PERMISSIONS
-- ============================================================

grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;

alter table public.reports enable row level security;

-- ============================================================
-- CITIZEN POLICIES
-- ============================================================

-- Users can see their own reports
create policy "reports_read_own"
on public.reports
for select
to authenticated
using (
  auth.uid() = user_id
);

-- Users can create reports for themselves
create policy "reports_insert_own"
on public.reports
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- ============================================================
-- AUTHORITY / ADMIN POLICIES
-- ============================================================

-- Admins can see every report
create policy "reports_admin_read"
on public.reports
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
);

-- Admins can update every report
create policy "reports_admin_update"
on public.reports
for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create trigger reports_touch
before update on public.reports
for each row
execute function public.touch_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index reports_user_id_idx
on public.reports(user_id);

create index reports_status_idx
on public.reports(status);

create index reports_created_at_idx
on public.reports(created_at desc);

create index reports_location_idx
on public.reports(latitude, longitude);