-- Complete fix for infinite recursion and admin login issues
-- This script removes all circular dependencies and creates a working admin system

-- First, drop all existing problematic policies and functions
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_authenticated_write" ON public.categories;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_write" ON public.products;
DROP POLICY IF EXISTS "orders_user_own" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_user_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "profiles_user_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "cart_items_user_own" ON public.cart_items;

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_safe();

-- Temporarily disable RLS on all tables to break any remaining circular dependencies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive admin check function
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.check_admin_role(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query without RLS interference
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS and create simple, non-recursive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can manage their own profiles
CREATE POLICY "profiles_own_access" ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow profile creation during signup
CREATE POLICY "profiles_insert_signup" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Categories: Public read, admin write using the safe function
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()));

-- Products: Public read, admin write
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL TO authenticated
  USING (public.check_admin_role(auth.uid()));

-- Orders: Users see their own, admins see all
CREATE POLICY "orders_user_access" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.check_admin_role(auth.uid()));

CREATE POLICY "orders_user_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.check_admin_role(auth.uid()));

-- Cart items: Users manage their own
CREATE POLICY "cart_items_user_access" ON public.cart_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_admin_role(UUID) TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

-- Ensure the role column exists and has proper constraints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Create an index for better performance on role checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);
