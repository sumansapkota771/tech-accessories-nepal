"use server"

import { createServerClient } from "@/lib/supabase/server"
import { placeOrderSchema } from "@/lib/validation"
import { z } from "zod"

interface PlaceOrderResult {
  success: boolean
  orderId?: string
  error?: string
}

interface CartProduct {
  id: string
  name: string
  price: number
  stock_quantity: number
  is_active: boolean
  vendor_id: string | null
  images: string[] | null
  image_url: string | null
}

interface VendorInfo {
  id: string
  commission_rate: number
  delivery_charge: number
  free_delivery_threshold: number | null
  estimated_delivery_time: string | null
}

// Compute per-vendor shipping based on vendor delivery settings.
// If vendor has self_delivery_confirmed and has set delivery_charge,
// use their settings. Otherwise apply platform default.
function computeVendorShipping(
  vendorSubtotal: number,
  vendor: VendorInfo | undefined,
  deliveryMethod: string,
): { charge: number; estimatedTime: string | null } {
  if (deliveryMethod === "self_pickup") {
    return { charge: 0, estimatedTime: "Pick up from seller" }
  }

  if (deliveryMethod === "express") {
    return { charge: 250, estimatedTime: "1-2 business days" }
  }

  // Standard delivery: use vendor settings if available
  if (vendor) {
    const threshold = vendor.free_delivery_threshold ?? 0
    if (threshold > 0 && vendorSubtotal >= threshold) {
      return { charge: 0, estimatedTime: vendor.estimated_delivery_time }
    }
    if (vendor.delivery_charge > 0) {
      return { charge: vendor.delivery_charge, estimatedTime: vendor.estimated_delivery_time }
    }
  }

  // Platform default: free above Rs. 5000, else Rs. 150
  return {
    charge: vendorSubtotal >= 5000 ? 0 : 150,
    estimatedTime: vendor?.estimated_delivery_time || "3-5 business days",
  }
}

export async function placeOrder(
  shippingAddress: {
    fullName: string
    phone: string
    address: string
    city: string
    postalCode: string
    notes: string
  },
  paymentMethod: string,
  deliveryMethod: string = "standard",
  orderNotes: string = "",
): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse({
    shippingAddress,
    paymentMethod,
    deliveryMethod,
    notes: orderNotes,
    termsAccepted: true,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to place an order." }
  }

  // Fetch cart items with full product data
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select(`
      id,
      quantity,
      product_id,
      products (
        id,
        name,
        price,
        stock_quantity,
        is_active,
        vendor_id,
        images,
        image_url
      )
    `)
    .eq("user_id", user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    return { success: false, error: "No items in cart." }
  }

  // Validate all products are available and in stock
  for (const item of cartItems) {
    const product = item.products as unknown as CartProduct | null

    if (!product || !product.is_active) {
      return { success: false, error: `One or more items in your cart are no longer available.` }
    }
    if (product.stock_quantity < item.quantity) {
      return {
        success: false,
        error: `"${product.name}" has only ${product.stock_quantity} in stock. Please update your cart.`,
      }
    }
  }

  // Atomically decrement stock for all items (prevents race conditions)
  const decrementedItems: { productId: string; quantity: number }[] = []
  for (const item of cartItems) {
    const { error: decrementError } = await supabase.rpc("decrement_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    })

    if (decrementError) {
      // Rollback: restore stock for previously decremented items
      for (const prev of decrementedItems) {
        await supabase.rpc("increment_stock", {
          p_product_id: prev.productId,
          p_quantity: prev.quantity,
        })
      }
      return { success: false, error: "Failed to reserve stock. Please try again." }
    }
    decrementedItems.push({ productId: item.product_id, quantity: item.quantity })
  }

  // Group cart items by vendor
  const vendorGroups = new Map<string, typeof cartItems>()
  const unassignedItems: typeof cartItems = []

  for (const item of cartItems) {
    const vendorId = (item.products as unknown as CartProduct | null)?.vendor_id
    if (!vendorId) {
      unassignedItems.push(item)
      continue
    }
    const group = vendorGroups.get(vendorId) || []
    group.push(item)
    vendorGroups.set(vendorId, group)
  }

  const vendorIds = Array.from(vendorGroups.keys())

  // Fetch vendor details (commission, delivery settings)
  const { data: vendorDetails } = vendorIds.length
    ? await supabase
        .from("vendors")
        .select("id, commission_rate, delivery_charge, free_delivery_threshold, estimated_delivery_time")
        .in("id", vendorIds)
    : { data: [] }

  const vendorMap = new Map<string, VendorInfo>(
    (vendorDetails || []).map((v) => [
      v.id,
      {
        id: v.id,
        commission_rate: v.commission_rate,
        delivery_charge: v.delivery_charge,
        free_delivery_threshold: v.free_delivery_threshold,
        estimated_delivery_time: v.estimated_delivery_time,
      },
    ]),
  )

  // Check for active promotions
  const { data: activePromotions } = vendorIds.length
    ? await supabase
        .from("seller_promotions")
        .select("vendor_id, commission_rate")
        .in("vendor_id", vendorIds)
        .eq("status", "active")
        .lte("start_date", new Date().toISOString())
        .gt("end_date", new Date().toISOString())
    : { data: [] }

  const promotionByVendor = new Map(
    (activePromotions || []).map((p) => [p.vendor_id, p.commission_rate]),
  )

  // Calculate per-vendor subtotals and shipping
  let orderSubtotal = 0
  let orderShipping = 0
  const vendorShippingCharges = new Map<string, number>()

  for (const [vendorId, items] of vendorGroups) {
    const vendorSubtotal = items.reduce((sum, item) => {
      const product = item.products as unknown as CartProduct | null
      return sum + (product?.price || 0) * item.quantity
    }, 0)

    const { charge } = computeVendorShipping(
      vendorSubtotal,
      vendorMap.get(vendorId),
      deliveryMethod,
    )

    vendorShippingCharges.set(vendorId, charge)
    orderSubtotal += vendorSubtotal
    orderShipping += charge
  }

  // Unassigned items shipping
  if (unassignedItems.length > 0) {
    const unassignedSubtotal = unassignedItems.reduce((sum, item) => {
      const product = item.products as unknown as CartProduct | null
      return sum + (product?.price || 0) * item.quantity
    }, 0)
    orderSubtotal += unassignedSubtotal
    orderShipping += unassignedSubtotal >= 5000 ? 0 : 150
  }

  const tax = Math.round(orderSubtotal * 0.13)
  const totalAmount = orderSubtotal + orderShipping + tax

  // Create master order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
      subtotal: orderSubtotal,
      shipping_cost: orderShipping,
      tax_amount: tax,
      discount_amount: 0,
      status: "pending",
      payment_method: paymentMethod,
      payment_status: "pending",
      delivery_method: deliveryMethod,
      notes: orderNotes || null,
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
    // Rollback stock
    for (const prev of decrementedItems) {
      await supabase.rpc("increment_stock", {
        p_product_id: prev.productId,
        p_quantity: prev.quantity,
      })
    }
    return { success: false, error: "Failed to create order." }
  }

  // Create suborders (seller orders)
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
      const product = item.products as unknown as CartProduct | null
      return sum + (product?.price || 0) * item.quantity
    }, 0)

    const commissionRate = promotionByVendor.get(vendorId) ?? vendorMap.get(vendorId)?.commission_rate ?? 0
    const commissionAmount = Math.round(groupSubtotal * (commissionRate / 100))

    const { data: suborder, error: suborderError } = await supabase
      .from("suborders")
      .insert({
        order_id: order.id,
        vendor_id: vendorId,
        subtotal: groupSubtotal,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        delivery_charge: vendorShippingCharges.get(vendorId) || 0,
        estimated_delivery_time: vendorMap.get(vendorId)?.estimated_delivery_time || null,
      })
      .select()
      .single()

    if (suborderError || !suborder) {
      // Rollback stock and order
      for (const prev of decrementedItems) {
        await supabase.rpc("increment_stock", {
          p_product_id: prev.productId,
          p_quantity: prev.quantity,
        })
      }
      await supabase.from("orders").delete().eq("id", order.id)
      return { success: false, error: "Failed to create seller order." }
    }

    for (const item of items) {
      const product = item.products as unknown as CartProduct | null
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

  // Unassigned items (no suborder)
  for (const item of unassignedItems) {
    const product = item.products as unknown as CartProduct | null
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
    // Rollback
    for (const prev of decrementedItems) {
      await supabase.rpc("increment_stock", {
        p_product_id: prev.productId,
        p_quantity: prev.quantity,
      })
    }
    await supabase.from("orders").delete().eq("id", order.id)
    return { success: false, error: "Failed to create order items." }
  }

  // Record order event
  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "order_placed",
    new_status: "pending",
    actor_id: user.id,
    notes: `${cartItems.length} item(s) from ${vendorGroups.size} seller(s)`,
    metadata: {
      subtotal: orderSubtotal,
      shipping: orderShipping,
      tax,
      total: totalAmount,
      delivery_method: deliveryMethod,
    },
  })

  // Clear cart
  const { error: clearCartError } = await supabase.from("cart_items").delete().eq("user_id", user.id)

  if (clearCartError) {
    console.error("Failed to clear cart:", clearCartError)
  }

  // Notify vendors
  for (const [vendorId, items] of vendorGroups) {
    const vendor = vendorMap.get(vendorId)
    await supabase.from("notifications").insert({
      user_id: vendorId,
      title: "New order received",
      message: `You have a new order with ${items.length} item(s). Please review and accept.`,
      type: "order",
      link: `/vendor`,
    })
  }

  return { success: true, orderId: order.id }
}
