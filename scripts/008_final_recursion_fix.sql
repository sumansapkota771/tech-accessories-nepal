-- Final fix for infinite recursion in RLS policies
-- This completely removes circular dependencies by avoiding profile queries in RLS policies

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
DROP POLICY IF EXISTS "categories_authenticated_write" ON public.categories;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_write" ON public.products;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_user_own" ON public.orders;
DROP POLICY IF EXISTS "orders_user_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Drop problematic functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_safe();

-- Disable RLS temporarily to clean up
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "profiles_own_access" ON public.profiles 
  FOR ALL TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Categories: Public read access, authenticated users can write
CREATE POLICY "categories_public_read" ON public.categories 
  FOR SELECT TO anon, authenticated 
  USING (true);

CREATE POLICY "categories_auth_write" ON public.categories 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "categories_auth_update" ON public.categories 
  FOR UPDATE TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categories_auth_delete" ON public.categories 
  FOR DELETE TO authenticated 
  USING (true);

-- Products: Public read access, authenticated users can write
CREATE POLICY "products_public_read" ON public.products 
  FOR SELECT TO anon, authenticated 
  USING (true);

CREATE POLICY "products_auth_write" ON public.products 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "products_auth_update" ON public.products 
  FOR UPDATE TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_auth_delete" ON public.products 
  FOR DELETE TO authenticated 
  USING (true);

-- Orders: Users can only access their own orders
CREATE POLICY "orders_own_access" ON public.orders 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cart items: Users can only access their own cart items
CREATE POLICY "cart_items_own_access" ON public.cart_items 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
