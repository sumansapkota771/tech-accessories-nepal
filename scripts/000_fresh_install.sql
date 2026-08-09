-- Fresh install: full schema for a brand-new Supabase project.
--
-- This is a consolidated replacement for scripts/001-010 (which were applied
-- incrementally to the previous project and accumulated RLS drift along the
-- way - e.g. script 007 recreates policies script 004 already created,
-- so replaying 001-009 verbatim on an empty database errors out partway
-- through). Run ONLY this file on a new project; scripts/001-010 are kept
-- for history but should not be run here.
--
-- Includes one fix beyond what 010 covered: app/admin/setup/page.tsx lets a
-- signed-in user self-promote to admin via a profile upsert. Nothing ever
-- restricted that to a one-time bootstrap, so any user could grant
-- themselves admin at any point. The trigger in section 10 closes that:
-- self-promotion to 'admin' is only allowed while zero admins exist yet.

-- ============================================================
-- 1. profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. categories
-- ============================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. vendors
-- ============================================================
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendors_status ON public.vendors(status);

-- ============================================================
-- 4. products
-- ============================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  image_url TEXT,
  images TEXT[],
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- ============================================================
-- 5. cart_items
-- ============================================================
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- 6. orders
-- ============================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT orders_user_id_auth_users_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Second FK to profiles(id) (same underlying user, since profiles.id = auth.users.id)
  -- exists purely so PostgREST can embed `profiles(...)` in order queries.
  CONSTRAINT orders_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. suborders (per-vendor slice of an order)
-- ============================================================
CREATE TABLE public.suborders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suborders_order_id ON public.suborders(order_id);
CREATE INDEX idx_suborders_vendor_id ON public.suborders(vendor_id);

-- ============================================================
-- 8. order_items
-- ============================================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  suborder_id UUID REFERENCES public.suborders(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_vendor_id ON public.order_items(vendor_id);
CREATE INDEX idx_order_items_suborder_id ON public.order_items(suborder_id);

-- ============================================================
-- 9. Helper functions (SECURITY DEFINER so RLS can't recurse into itself)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_admin_role(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_vendor_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.vendors WHERE user_id = user_uuid;
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_approved_vendor_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.vendors WHERE user_id = user_uuid AND status = 'approved';
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_admin_role(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_id(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_approved_vendor_id(UUID) TO authenticated, anon;

-- ============================================================
-- 10. Protective triggers
-- ============================================================

-- Only an admin may grant 'admin'; the one exception is bootstrapping the
-- very first admin account when none exists yet (what app/admin/setup does).
CREATE OR REPLACE FUNCTION public.protect_profile_role_field()
RETURNS TRIGGER AS $$
BEGIN
  IF public.check_admin_role(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'admin' AND EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.role := OLD.role;
    ELSE
      NEW.role := 'user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_profile_role_field
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_field();

-- Only an admin may change a vendor's status/commission_rate.
CREATE OR REPLACE FUNCTION public.protect_vendor_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_admin_role(auth.uid()) THEN
    NEW.status := OLD.status;
    NEW.commission_rate := OLD.commission_rate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_vendor_admin_fields
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_admin_fields();

-- New vendor-owned products always start 'pending'; vendors can't self-approve.
CREATE OR REPLACE FUNCTION public.protect_product_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL AND NOT public.check_admin_role(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.approval_status := 'pending';
    ELSIF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_product_approval_status
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_approval_status();

-- Customers may only self-cancel a pending order; everything else needs admin.
CREATE OR REPLACE FUNCTION public.protect_order_customer_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_admin_role(auth.uid()) THEN
    IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      NULL;
    ELSE
      NEW.status := OLD.status;
    END IF;
    NEW.total_amount := OLD.total_amount;
    NEW.payment_status := OLD.payment_status;
    NEW.payment_method := OLD.payment_method;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_order_customer_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_customer_updates();

-- Only status is vendor-editable on a suborder; financial fields are fixed at checkout.
CREATE OR REPLACE FUNCTION public.protect_suborder_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_admin_role(auth.uid()) THEN
    NEW.order_id := OLD.order_id;
    NEW.vendor_id := OLD.vendor_id;
    NEW.subtotal := OLD.subtotal;
    NEW.commission_rate := OLD.commission_rate;
    NEW.commission_amount := OLD.commission_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_suborder_financial_fields
  BEFORE UPDATE ON public.suborders
  FOR EACH ROW EXECUTE FUNCTION public.protect_suborder_financial_fields();

-- ============================================================
-- 11. Enable RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suborders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. Policies
-- ============================================================

-- profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.check_admin_role(auth.uid()));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.check_admin_role(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.check_admin_role(auth.uid()));

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- categories: public read, admin write
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()))
  WITH CHECK (public.check_admin_role(auth.uid()));

-- vendors
CREATE POLICY "vendors_public_read_approved" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "vendors_select_own" ON public.vendors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "vendors_insert_own_application" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "vendors_update_own_or_admin" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.check_admin_role(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.check_admin_role(auth.uid()));

CREATE POLICY "vendors_admin_all" ON public.vendors
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()))
  WITH CHECK (public.check_admin_role(auth.uid()));

-- products
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND approval_status = 'approved'
    AND (vendor_id IS NULL OR vendor_id IN (SELECT id FROM public.vendors WHERE status = 'approved'))
  );

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()))
  WITH CHECK (public.check_admin_role(auth.uid()));

CREATE POLICY "products_vendor_manage_own" ON public.products
  FOR ALL TO authenticated
  USING (vendor_id = public.get_approved_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = public.get_approved_vendor_id(auth.uid()));

-- cart_items: fully self-owned
CREATE POLICY "cart_items_own_access" ON public.cart_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- orders
CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.check_admin_role(auth.uid()));

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_update_own_or_admin" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.check_admin_role(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.check_admin_role(auth.uid()));

-- suborders
CREATE POLICY "suborders_vendor_select_own" ON public.suborders
  FOR SELECT TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "suborders_vendor_update_own" ON public.suborders
  FOR UPDATE TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "suborders_customer_select" ON public.suborders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = suborders.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "suborders_insert_own_order" ON public.suborders
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid()));

CREATE POLICY "suborders_admin_all" ON public.suborders
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()))
  WITH CHECK (public.check_admin_role(auth.uid()));

-- order_items
CREATE POLICY "order_items_select_own_or_vendor_or_admin" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR vendor_id = public.get_vendor_id(auth.uid())
    OR public.check_admin_role(auth.uid())
  );

CREATE POLICY "order_items_insert_own_order" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid()));

-- ============================================================
-- 13. Sample seed data (safe to delete later from the admin panel)
-- ============================================================
INSERT INTO public.categories (name, description, image_url) VALUES
('Phone Cases', 'Protective cases for smartphones', '/placeholder.svg?height=200&width=200'),
('Chargers & Cables', 'Charging solutions and cables', '/placeholder.svg?height=200&width=200'),
('Headphones & Earbuds', 'Audio accessories and headphones', '/placeholder.svg?height=200&width=200'),
('Screen Protectors', 'Screen protection for devices', '/placeholder.svg?height=200&width=200'),
('Power Banks', 'Portable charging solutions', '/placeholder.svg?height=200&width=200'),
('Phone Stands & Mounts', 'Device holders and mounts', '/placeholder.svg?height=200&width=200');

WITH category_ids AS (
  SELECT id, name FROM public.categories
)
INSERT INTO public.products (name, description, price, original_price, category_id, image_url, images, stock_quantity, is_featured, specifications)
SELECT
  product_name, product_description, product_price, original_price, cat.id,
  main_image, product_images, stock, is_featured, specs
FROM (
  VALUES
    ('iPhone 15 Pro Clear Case', 'Premium transparent case with MagSafe compatibility', 2500.00, 3000.00, 'Phone Cases', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 50, true, '{"material": "TPU", "compatibility": "iPhone 15 Pro", "features": ["MagSafe", "Drop Protection"]}'::jsonb),
    ('Samsung Galaxy S24 Leather Case', 'Genuine leather case with card slots', 3200.00, 3800.00, 'Phone Cases', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 30, true, '{"material": "Genuine Leather", "compatibility": "Samsung Galaxy S24", "features": ["Card Slots", "Premium Feel"]}'::jsonb),
    ('USB-C Fast Charger 65W', 'High-speed charging adapter with USB-C', 1800.00, 2200.00, 'Chargers & Cables', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 75, true, '{"power": "65W", "ports": "USB-C", "features": ["Fast Charging", "Compact Design"]}'::jsonb),
    ('Lightning to USB-C Cable 2m', 'Durable braided cable for Apple devices', 1200.00, 1500.00, 'Chargers & Cables', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 100, false, '{"length": "2m", "material": "Braided Nylon", "compatibility": "iPhone, iPad"}'::jsonb),
    ('Wireless Bluetooth Earbuds Pro', 'Premium earbuds with noise cancellation', 8500.00, 10000.00, 'Headphones & Earbuds', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 25, true, '{"battery": "8 hours + 24h case", "features": ["ANC", "Wireless Charging", "IPX4"]}'::jsonb),
    ('Gaming Headset RGB', 'Professional gaming headset with RGB lighting', 6500.00, 7500.00, 'Headphones & Earbuds', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 40, false, '{"connectivity": "USB + 3.5mm", "features": ["RGB Lighting", "Surround Sound"]}'::jsonb),
    ('Tempered Glass Screen Protector', '9H hardness screen protection', 800.00, 1000.00, 'Screen Protectors', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 200, false, '{"hardness": "9H", "thickness": "0.33mm", "features": ["Anti-Fingerprint"]}'::jsonb),
    ('20000mAh Power Bank', 'High-capacity portable charger with fast charging', 4500.00, 5200.00, 'Power Banks', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 60, true, '{"capacity": "20000mAh", "ports": "2x USB-A, 1x USB-C", "features": ["Fast Charging", "LED Display"]}'::jsonb),
    ('Adjustable Phone Stand', 'Foldable desktop stand for phones and tablets', 1500.00, 1800.00, 'Phone Stands & Mounts', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 80, false, '{"material": "Aluminum Alloy", "compatibility": "4-12 inch devices", "features": ["Adjustable Angle", "Foldable"]}'::jsonb),
    ('Car Phone Mount Magnetic', 'Strong magnetic car mount for dashboard', 2200.00, 2600.00, 'Phone Stands & Mounts', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 45, false, '{"mount_type": "Dashboard/Windshield", "features": ["360 Rotation", "Strong Magnets"]}'::jsonb)
) AS products(product_name, product_description, product_price, original_price, category_name, main_image, product_images, stock, is_featured, specs)
JOIN category_ids cat ON cat.name = products.category_name;
