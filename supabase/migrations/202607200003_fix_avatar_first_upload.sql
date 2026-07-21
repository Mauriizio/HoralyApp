-- Allow first avatar upload metadata RETURNING without enabling broad bucket listing.

drop policy if exists avatars_select_own_authenticated on storage.objects;
create policy avatars_select_own_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
  and storage.allow_any_operation(array[
    'storage.object.upload',
    'storage.object.upload_update',
    'storage.object.get_authenticated',
    'storage.object.info_authenticated',
    'object.get_authenticated_info',
    'object.head_authenticated_info',
    'storage.object.delete',
    'storage.object.delete_many'
  ])
);
