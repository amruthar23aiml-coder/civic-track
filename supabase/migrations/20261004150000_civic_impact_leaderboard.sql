create or replace function public.civic_impact_leaderboard(_period text default 'all_time')
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  impact_points bigint,
  issues_resolved bigint,
  initiatives_completed bigint,
  verified_reports bigint,
  rank_position bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if _period is null or _period not in ('this_month', 'all_time') then
    raise exception 'Unsupported leaderboard period: %', _period;
  end if;

  return query
  with period_bounds as (
    select
      date_trunc('month', now()) as month_start,
      date_trunc('month', now()) + interval '1 month' as next_month_start
  ),
  report_stats as (
    select
      r.user_id,
      count(*) filter (
        where r.status in ('verified', 'assigned', 'in_progress', 'completed')
          and (
            _period = 'all_time'
            or (r.created_at >= b.month_start and r.created_at < b.next_month_start)
          )
      )::bigint as valid_reports,
      count(*) filter (
        where r.status in ('verified', 'assigned', 'in_progress', 'completed')
          and (
            _period = 'all_time'
            or (r.created_at >= b.month_start and r.created_at < b.next_month_start)
          )
      )::bigint as verified_reports,
      count(*) filter (
        where r.status = 'completed'
          and (
            _period = 'all_time'
            or (
              r.completed_at >= b.month_start
              and r.completed_at < b.next_month_start
            )
          )
      )::bigint as issues_resolved
    from public.reports r
    cross join period_bounds b
    group by r.user_id
  ),
  initiative_stats as (
    select
      reg.volunteer_id as user_id,
      count(*) filter (
        where e.status <> 'cancelled'
          and (
            _period = 'all_time'
            or (reg.created_at >= b.month_start and reg.created_at < b.next_month_start)
          )
      )::bigint as initiatives_joined,
      count(*) filter (
        where reg.attendance = 'attended'
          and e.status <> 'cancelled'
          and (
            _period = 'all_time'
            or (e.starts_at >= b.month_start and e.starts_at < b.next_month_start)
          )
      )::bigint as initiatives_completed
    from public.registrations reg
    join public.events e on e.id = reg.event_id
    cross join period_bounds b
    group by reg.volunteer_id
  ),
  scored as (
    select
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      p.city,
      (
        coalesce(r.valid_reports, 0) * 10
        + coalesce(r.verified_reports, 0) * 15
        + coalesce(r.issues_resolved, 0) * 25
        + coalesce(i.initiatives_joined, 0) * 10
        + coalesce(i.initiatives_completed, 0) * 25
      )::bigint as impact_points,
      coalesce(r.issues_resolved, 0)::bigint as issues_resolved,
      coalesce(i.initiatives_completed, 0)::bigint as initiatives_completed,
      coalesce(r.verified_reports, 0)::bigint as verified_reports
    from public.profiles p
    left join report_stats r on r.user_id = p.id
    left join initiative_stats i on i.user_id = p.id
  ),
  ranked as (
    select
      s.*,
      row_number() over (
        order by s.impact_points desc, lower(coalesce(s.full_name, '')), s.user_id
      ) as rank_position
    from scored s
    where s.impact_points > 0 or s.user_id = auth.uid()
  )
  select
    r.user_id,
    r.full_name,
    r.avatar_url,
    r.city,
    r.impact_points,
    r.issues_resolved,
    r.initiatives_completed,
    r.verified_reports,
    r.rank_position
  from ranked r
  where r.rank_position <= 100 or r.user_id = auth.uid()
  order by r.rank_position;
end;
$$;

grant execute on function public.civic_impact_leaderboard(text) to anon, authenticated;
