
-- Fix 1: Restrict logos bucket write operations to authenticated users only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete logos" ON storage.objects;

-- Create new policies requiring authentication for write operations
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- Fix 2: Restrict configuracion table to authenticated users only
DROP POLICY IF EXISTS "Allow anon full access to configuracion" ON public.configuracion;

CREATE POLICY "Authenticated users can read configuracion"
ON public.configuracion FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can modify configuracion"
ON public.configuracion FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
