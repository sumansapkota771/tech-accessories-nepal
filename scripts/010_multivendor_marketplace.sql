-- Phase 1: Multi-vendor marketplace foundation
--
-- This migration also cleans up RLS drift accumulated across scripts 002-009:
-- scripts 007/008 left blanket "any authenticated user can write" policies on
-- products/categories active alongside the admin-only ones (permissive policies
-- OR together, so the loosest one wins). That's incompatible with vendor
-- isolation, so this script drops every known legacy policy name and rebuilds
-- a single authoritative set. It also adds the order_items INSERT policy that
-- was never created (checkout's insert into order_items would otherwise be
-- rejected by RLS) and fixes the orders->profiles relationship so admin order
-- queries can embed customer profiles.

-- ============================================================
-- 1. Drop legacy policies (every name seen across scripts 001-009)
-- ============================================================
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories are editable by admins" ON public.categories;
DROP POLICY IF EXISTS "categories_authenticated_write" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_write" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_update" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_delete" ON public.categories;

DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_write" ON public.products;
DROP POLICY IF EXISTS "products_auth_write" ON public.products;
DROP POLICY IF EXISTS "products_auth_update" ON public.products;
DROP POLICY IF EXISTS "products_auth_delete" ON public.products;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
DROP POLICY IF EXISTS "admin_orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_user_own" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_user_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_own_access" ON public.orders;
DROP POLICY IF EXISTS "orders_user_access" ON public.orders;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "admin_profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;

DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_safe();

-- ============================================================
-- 2. Admin-check helper (kept from 009, redefined defensively)
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

GRANT EXECUTE ON FUNCTION public.check_admin_role(UUID) TO authenticated, anon;

-- ============================================================
-- 3. profiles.role gains 'vendor'
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'vendor', 'admin'));

-- ============================================================
-- 4. vendors table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
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

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- Vendor-lookup helpers (SECURITY DEFINER so RLS on `vendors` doesn't recurse)
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

GRANT EXECUTE ON FUNCTION public.get_vendor_id(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_approved_vendor_id(UUID) TO authenticated, anon;

-- Only admins may change status/commission_rate; vendors editing their own
-- row can only touch profile fields (store_name, description, etc).
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

DROP TRIGGER IF EXISTS trg_protect_vendor_admin_fields ON public.vendors;
CREATE TRIGGER trg_protect_vendor_admin_fields
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_admin_fields();

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

-- ============================================================
-- 5. products: vendor ownership + moderation
-- ============================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);

-- New vendor-owned products always start 'pending' regardless of client
-- input; vendors editing an existing listing can't self-approve it back.
-- Admin-owned products (vendor_id IS NULL) are unaffected.
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

DROP TRIGGER IF EXISTS trg_protect_product_approval_status ON public.products;
CREATE TRIGGER trg_protect_product_approval_status
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_approval_status();

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

-- ============================================================
-- 6. categories: admin-only writes (restores intent after 007/008 drift)
-- ============================================================
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()))
  WITH CHECK (public.check_admin_role(auth.uid()));

-- ============================================================
-- 7. profiles: restore admin visibility into all users
-- ============================================================
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

-- ============================================================
-- 8. orders -> profiles relationship (fixes admin order/profile embedding;
--    admin-orders.tsx previously queried a non-existent `customer_id` column)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Customers may only self-cancel a pending order; every other field/status
-- transition on an existing order requires admin.
CREATE OR REPLACE FUNCTION public.protect_order_customer_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_admin_role(auth.uid()) THEN
    IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      NULL; -- allowed: customer self-cancel
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

DROP TRIGGER IF EXISTS trg_protect_order_customer_updates ON public.orders;
CREATE TRIGGER trg_protect_order_customer_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_customer_updates();

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

-- ============================================================
-- 9. suborders: per-vendor slice of an order
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suborders (
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

ALTER TABLE public.suborders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_suborders_order_id ON public.suborders(order_id);
CREATE INDEX IF NOT EXISTS idx_suborders_vendor_id ON public.suborders(vendor_id);

-- Only status is vendor-editable; financial fields are set once at checkout.
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

DROP TRIGGER IF EXISTS trg_protect_suborder_financial_fields ON public.suborders;
CREATE TRIGGER trg_protect_suborder_financial_fields
  BEFORE UPDATE ON public.suborders
  FOR EACH ROW EXECUTE FUNCTION public.protect_suborder_financial_fields();

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

-- ============================================================
-- 10. order_items: vendor/suborder tagging + missing INSERT policy
-- ============================================================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS suborder_id UUID REFERENCES public.suborders(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_vendor_id ON public.order_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_suborder_id ON public.order_items(suborder_id);

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
