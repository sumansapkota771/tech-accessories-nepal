-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Fix RLS policies to prevent infinite recursion by using simpler checks
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

-- Admin policies for categories (simple admin check)
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Admin policies for products (simple admin check)
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Admin policies for orders (view and update all orders)
CREATE POLICY "orders_admin_select" ON public.orders FOR SELECT TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Admin policies for profiles (view all users) - allow admins to see all profiles
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to update any profile
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
