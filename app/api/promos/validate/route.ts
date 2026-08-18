import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Promo code is required" }, { status: 400 })
    }

    if (typeof subtotal !== "number" || subtotal <= 0) {
      return NextResponse.json({ valid: false, error: "Invalid subtotal" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Look up the promo code in the dedicated promo_codes table
    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, vendor_id, expires_at")
      .ilike("code", code.trim())
      .eq("is_active", true)
      .single()

    if (error || !promo) {
      return NextResponse.json({ valid: false, error: "Invalid promo code" })
    }

    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This promo code has expired" })
    }

    // Check usage limit
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" })
    }

    // Check minimum order amount
    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is Rs. ${promo.min_order_amount.toLocaleString()}`,
      })
    }

    // Calculate discount
    let discountRate: number
    if (promo.discount_type === "percentage") {
      discountRate = Math.min(promo.discount_value / 100, 0.5) // Cap at 50%
    } else {
      // Fixed amount discount - convert to rate relative to subtotal
      discountRate = Math.min(promo.discount_value / subtotal, 0.5)
    }

    return NextResponse.json({
      valid: true,
      discount_rate: discountRate,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      promo_id: promo.id,
      vendor_id: promo.vendor_id,
    })
  } catch (error) {
    console.error("Error validating promo code:", error)
    return NextResponse.json({ valid: false, error: "Failed to validate promo code" }, { status: 500 })
  }
}
