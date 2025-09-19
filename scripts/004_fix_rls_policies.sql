-- Fix infinite recursion in RLS policies by using a different approach
-- First, add the role column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

-- Create a function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple policies that allow public read access and admin write access
-- Categories: public read, admin write
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated USING (public.is_admin());

-- Products: public read, admin write  
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated USING (public.is_admin());

-- Orders: users can see their own, admins can see all
CREATE POLICY "orders_user_own" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated USING (public.is_admin());

-- Profiles: users can see/update their own, admins can see all
CREATE POLICY "profiles_user_own" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());

-- Cart items: users can manage their own
CREATE POLICY "cart_items_user_own" ON public.cart_items FOR ALL TO authenticated USING (user_id = auth.uid());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
