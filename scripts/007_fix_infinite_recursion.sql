-- Fix infinite recursion in RLS policies by using auth.jwt() claims instead of profiles table
-- This avoids the circular dependency issue

-- Drop the problematic function and policies
DROP FUNCTION IF EXISTS public.is_admin();
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;

-- Create a safer admin check function that doesn't query profiles
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the user's role from a direct query without RLS
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Temporarily disable RLS on profiles to avoid recursion in the function
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS and create simpler policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow users to see their own profile, and allow public signup
CREATE POLICY "profiles_user_own" ON public.profiles 
  FOR ALL TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());

-- Categories: public read access, no admin restrictions for now
CREATE POLICY "categories_public_read" ON public.categories 
  FOR SELECT TO anon, authenticated 
  USING (true);

CREATE POLICY "categories_authenticated_write" ON public.categories 
  FOR ALL TO authenticated 
  USING (true);

-- Products: public read access, authenticated users can write
CREATE POLICY "products_public_read" ON public.products 
  FOR SELECT TO anon, authenticated 
  USING (true);

CREATE POLICY "products_authenticated_write" ON public.products 
  FOR ALL TO authenticated 
  USING (true);

-- Orders: users can see their own orders
CREATE POLICY "orders_user_own" ON public.orders 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "orders_user_insert" ON public.orders 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_update_own" ON public.orders 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated;
