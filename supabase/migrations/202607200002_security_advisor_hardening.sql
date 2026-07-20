-- Supabase Security Advisor hardening: function search_path, direct EXECUTE grants and avatar listing guardrails.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, user_id, email, display_name)
  values (new.id, new.id, new.email, pg_catalog.coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public;
revoke execute on function public.handle_new_user_profile() from anon;
revoke execute on function public.handle_new_user_profile() from authenticated;
grant execute on function public.handle_new_user_profile() to supabase_auth_admin;

drop policy if exists avatars_select_public on storage.objects;
drop policy if exists avatars_select_own_authenticated on storage.objects;
create policy avatars_select_own_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
  and storage.allow_any_operation(array['object.get', 'object.get_info', 'object.get_authenticated', 'object.get_authenticated_info'])
);

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
