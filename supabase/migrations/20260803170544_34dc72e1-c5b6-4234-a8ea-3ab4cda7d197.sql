create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_exists boolean;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'volunteer') on conflict do nothing;

  select exists (select 1 from public.user_roles where role = 'admin') into admin_exists;
  if not admin_exists then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'), (new.id, 'organizer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can grant roles"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can revoke roles"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

grant insert, delete on public.user_roles to authenticated;