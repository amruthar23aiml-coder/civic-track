-- Allow the read-only public reports view to show approved civic issues
-- without exposing submitted or rejected reports.
grant select on public.reports to anon;

create policy "reports_public_read"
on public.reports
for select
using (
  status in (
    'verified',
    'assigned',
    'in_progress',
    'completed'
  )
);
