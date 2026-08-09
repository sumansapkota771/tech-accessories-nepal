-- Storage bucket + policies for real image uploads (product photos, category
-- images, vendor logos/banners), replacing manual "paste an image URL" fields.
--
-- Run this in the SQL Editor same as the other scripts/000*.sql files.
--
-- Path convention enforced below: every uploaded object must live under
-- "<uploader's auth uid>/...", e.g. "3fa8.../products/172-abc123.jpg". That's
-- what the owner-scoped policies check via storage.foldername(name)[1].

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read: product/category/store images need to be visible to anyone
-- browsing the site, including anonymous visitors.
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'images');

-- Any authenticated user (customer, vendor, admin) can upload, but only into
-- their own "<uid>/..." folder.
DROP POLICY IF EXISTS "images_owner_insert" ON storage.objects;
CREATE POLICY "images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "images_owner_update" ON storage.objects;
CREATE POLICY "images_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "images_owner_delete" ON storage.objects;
CREATE POLICY "images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can manage (moderate/remove) any uploaded image regardless of folder.
DROP POLICY IF EXISTS "images_admin_all" ON storage.objects;
CREATE POLICY "images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'images' AND public.check_admin_role(auth.uid()))
  WITH CHECK (bucket_id = 'images' AND public.check_admin_role(auth.uid()));
