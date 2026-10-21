-- Owners may list/read objects in their own folder (needed to clean up
-- replaced or deleted photos). Public image URLs keep working without this.
create policy "owners read own photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'invitation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
