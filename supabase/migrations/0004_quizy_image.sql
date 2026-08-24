
alter table questions
  add column image_url text;

insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;


--- RLS ---
-- Admin upload
create policy "Admins can upload question images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'question-images'
  and public.is_admin()
);

-- Admin update/replace
create policy "Admins can update question images"
on storage.objects
for update
to authenticated
using (bucket_id = 'question-images' and public.is_admin())
with check (bucket_id = 'question-images' and public.is_admin());

-- Admin delete
create policy "Admins can delete question images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'question-images' and public.is_admin());

-- Ai cũng xem được (vì bucket public, nhưng vẫn cần policy select để list metadata qua API)
create policy "Anyone can view question images"
on storage.objects
for select
to public
using (bucket_id = 'question-images');