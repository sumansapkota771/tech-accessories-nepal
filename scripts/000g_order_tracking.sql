-- Adds a tracking number to suborders so vendors can attach a courier
-- reference when they mark an item shipped, and customers can see it.
-- Run after scripts/000_fresh_install.sql.

ALTER TABLE public.suborders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- The existing trg_protect_suborder_financial_fields trigger only locks down
-- financial fields (subtotal/commission/etc) - tracking_number is already
-- vendor-editable via the suborders_vendor_update_own policy, same as status.
