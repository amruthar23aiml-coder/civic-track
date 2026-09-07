create policy "event_photos_read_auth" on storage.objects for select to authenticated
  using (bucket_id = 'event-photos');
create policy "event_photos_upload_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "event_photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);