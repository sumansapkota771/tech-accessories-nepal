-- Product reviews & ratings. Run after scripts/000_fresh_install.sql.
--
-- A review requires a verified purchase: the reviewer must own a delivered
-- order_item for that product (checked against the item's suborder status
-- for vendor-owned products, or the parent order's status for legacy
-- platform-owned products with no suborder).

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);

-- Second FK so PostgREST can embed `profiles(...)` on a review (reviewer name).
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "reviews_insert_verified_purchase" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      LEFT JOIN public.suborders so ON so.id = oi.suborder_id
      WHERE oi.product_id = reviews.product_id
        AND o.user_id = auth.uid()
        AND (so.status = 'delivered' OR (so.id IS NULL AND o.status = 'delivered'))
    )
  );

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own_or_admin" ON public.reviews
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.check_admin_role(auth.uid()));
