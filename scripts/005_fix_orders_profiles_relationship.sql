-- Fix the relationship between orders and profiles tables
-- The issue is that both tables reference auth.users but there's no direct relationship

-- First, let's add a foreign key constraint to make the relationship explicit
-- Since both orders.user_id and profiles.id reference auth.users(id), 
-- we can create a view or modify the query approach

-- Option 1: Create a view that joins orders with profiles
CREATE OR REPLACE VIEW orders_with_profiles AS
SELECT 
  o.*,
  p.full_name,
  p.email,
  p.phone,
  p.address
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id;

-- Option 2: Add RLS policies for admin access to orders and profiles
-- Allow admin users to read all orders and profiles
CREATE POLICY "admin_orders_select_all" ON public.orders 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_profiles_select_all" ON public.profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT ON orders_with_profiles TO authenticated;
GRANT SELECT ON orders_with_profiles TO anon;
