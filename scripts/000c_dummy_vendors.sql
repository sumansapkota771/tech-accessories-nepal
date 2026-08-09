-- Turns already-signed-up accounts into approved vendor stores, for testing
-- the marketplace with real multi-vendor data.
--
-- Prerequisite: sign up each account below via /auth/sign-up FIRST (this
-- script can't create auth users, only Claude with your service_role key
-- could, and you were right not to hand that over). Then edit the emails
-- below to match real accounts you created, and run this in the SQL Editor.
--
-- This bypasses the normal pending -> admin-approval flow on purpose (status
-- is set to 'approved' directly) since it's for seeding test data, not real
-- seller onboarding.

-- ============================================================
-- Vendor 1
-- ============================================================
INSERT INTO public.vendors (user_id, store_name, slug, description, phone, address, status, commission_rate)
SELECT id, 'Kathmandu Gadgets', 'kathmandu-gadgets',
       'Your trusted source for phone and computer accessories in Kathmandu.',
       '+977-9800000001', 'New Road, Kathmandu', 'approved', 10
FROM auth.users WHERE email = 'vendor1@example.com'
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles SET role = 'vendor' WHERE email = 'vendor1@example.com';

-- ============================================================
-- Vendor 2
-- ============================================================
INSERT INTO public.vendors (user_id, store_name, slug, description, phone, address, status, commission_rate)
SELECT id, 'Pokhara Tech Hub', 'pokhara-tech-hub',
       'Audio gear, chargers, and computer peripherals shipped from Pokhara.',
       '+977-9800000002', 'Lakeside, Pokhara', 'approved', 12
FROM auth.users WHERE email = 'vendor2@example.com'
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles SET role = 'vendor' WHERE email = 'vendor2@example.com';

-- ============================================================
-- Hand a few existing (platform-owned, vendor_id IS NULL) dummy products
-- to these stores so their storefronts and admin vendor filtering aren't
-- empty. Only reassigns products that don't already belong to a vendor.
-- ============================================================
UPDATE public.products
SET vendor_id = (SELECT id FROM public.vendors WHERE slug = 'kathmandu-gadgets')
WHERE name IN ('iPhone 15 Pro Clear Case', 'USB-C Fast Charger 65W', 'Wireless Bluetooth Earbuds Pro', 'Tempered Glass Screen Protector')
  AND vendor_id IS NULL
  AND EXISTS (SELECT 1 FROM public.vendors WHERE slug = 'kathmandu-gadgets');

UPDATE public.products
SET vendor_id = (SELECT id FROM public.vendors WHERE slug = 'pokhara-tech-hub')
WHERE name IN ('Samsung Galaxy S24 Leather Case', 'Gaming Headset RGB', '20000mAh Power Bank', 'Car Phone Mount Magnetic')
  AND vendor_id IS NULL
  AND EXISTS (SELECT 1 FROM public.vendors WHERE slug = 'pokhara-tech-hub');
