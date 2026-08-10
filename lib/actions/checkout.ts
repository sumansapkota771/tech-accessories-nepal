"use server"

import { createServerClient } from "@/lib/supabase/server"

interface ShippingAddress {
  fullName: string
  phone: string
  address: string
  city: string
  postalCode: string
  notes: string
}

interface PlaceOrderResult {
  success: boolean
  orderId?: string
  error?: string
}

// Prices and totals are always recomputed here from the `products` table
// rather than trusted from the client, since a caller could otherwise submit
// arbitrary prices for a "successful" order (RLS only checks row ownership,
// not that the price/total is legitimate).
export async function placeOrder(
  shippingAddress: ShippingAddress,
  paymentMethod: string,
): Promise<PlaceOrderResult> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to place an order." }
  }

  if (paymentMethod !== "cod") {
    return { success: false, error: "This payment method is not available yet." }
  }

  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      quantity,
      product_id,
      products (
        id,
        price,
        stock_quantity,
        is_active,
        vendor_id
      )
    `,
    )
    .eq("user_id", user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    return { success: false, error: "No items in cart." }
  }

  for (const item of cartItems) {
    const product = item.products as unknown as {
      id: string
      price: number
      stock_quantity: number
      is_active: boolean
      vendor_id: string | null
    } | null

    if (!product || !product.is_active) {
      return { success: false, error: "One or more items in your cart are no longer available." }
    }
    if (product.stock_quantity < item.quantity) {
      return { success: false, error: "One or more items in your cart are out of stock." }
    }
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const product = item.products as unknown as { price: number } | null
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  const shippingCost = subtotal >= 5000 ? 0 : 150
  const tax = Math.round(subtotal * 0.13)
  const totalAmount = subtotal + shippingCost + tax

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
      status: "pending",
      payment_method: paymentMethod,
      payment_status: "pending",
      shipping_address: {
        full_name: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        notes: shippingAddress.notes,
      },
    })
    .select()
    .single()

  if (orderError || !order) {
    return { success: false, error: "Failed to create order." }
  }

  const vendorGroups = new Map<string, typeof cartItems>()
  const unassignedItems: typeof cartItems = []

  for (const item of cartItems) {
    const vendorId = (item.products as unknown as { vendor_id: string | null } | null)?.vendor_id
    if (!vendorId) {
      unassignedItems.push(item)
      continue
    }
    const group = vendorGroups.get(vendorId) || []
    group.push(item)
    vendorGroups.set(vendorId, group)
  }

  const vendorIds = Array.from(vendorGroups.keys())
  const { data: vendors, error: vendorsError } = vendorIds.length
    ? await supabase.from("vendors").select("id, commission_rate").in("id", vendorIds)
    : { data: [], error: null }

  if (vendorsError) {
    return { success: false, error: "Failed to load vendor details." }
  }

  const commissionByVendor = new Map((vendors || []).map((v) => [v.id, v.commission_rate]))
  const orderItems: {
    order_id: string
    product_id: string
    quantity: number
    price: number
    vendor_id: string | null
    suborder_id: string | null
  }[] = []

  for (const [vendorId, items] of vendorGroups) {
    const groupSubtotal = items.reduce((sum, item) => {
      const product = item.products as unknown as { price: number } | null
      return sum + (product?.price || 0) * item.quantity
    }, 0)
    const commissionRate = commissionByVendor.get(vendorId) ?? 0
    const commissionAmount = Math.round(groupSubtotal * (commissionRate / 100))

    const { data: suborder, error: suborderError } = await supabase
      .from("suborders")
      .insert({
        order_id: order.id,
        vendor_id: vendorId,
        subtotal: groupSubtotal,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
      })
      .select()
      .single()

    if (suborderError || !suborder) {
      return { success: false, error: "Failed to create vendor order." }
    }

    for (const item of items) {
      const product = item.products as unknown as { price: number } | null
      orderItems.push({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: product?.price || 0,
        vendor_id: vendorId,
        suborder_id: suborder.id,
      })
    }
  }

  for (const item of unassignedItems) {
    const product = item.products as unknown as { price: number } | null
    orderItems.push({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: product?.price || 0,
      vendor_id: null,
      suborder_id: null,
    })
  }

  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItems)

  if (orderItemsError) {
    return { success: false, error: "Failed to create order items." }
  }

  const { error: clearCartError } = await supabase.from("cart_items").delete().eq("user_id", user.id)

  if (clearCartError) {
    console.error("Failed to clear cart:", clearCartError)
  }

  return { success: true, orderId: order.id }
}
