"use server"

import { createServerClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import type { OrderStatus, SuborderStatus } from "@/lib/types"

interface ActionResult {
  success: boolean
  error?: string
}

// Valid status transitions for master orders
const VALID_MASTER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["partially_shipped", "shipped", "cancelled"],
  partially_shipped: ["shipped", "cancelled"],
  shipped: ["partially_delivered", "delivered", "cancelled"],
  partially_delivered: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

// Valid status transitions for suborders
const VALID_SUBORDER_TRANSITIONS: Record<SuborderStatus, SuborderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["processing", "cancelled"],
  processing: ["ready_for_delivery", "cancelled"],
  ready_for_delivery: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
}

// Advance suborder status with transition validation
export async function advanceSuborderStatus(
  suborderId: string,
  newStatus: SuborderStatus,
  notes?: string,
  trackingNumber?: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required" }
  }

  // Fetch current suborder
  const { data: suborder, error: fetchError } = await supabase
    .from("suborders")
    .select("id, order_id, vendor_id, status")
    .eq("id", suborderId)
    .single()

  if (fetchError || !suborder) {
    return { success: false, error: "Suborder not found" }
  }

  // Verify the user is the vendor for this suborder (or admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Vendor ID in suborders references vendors.id, not auth.users.id
  // We need to look up the vendor record by user_id
  let isAuthorized = profile?.role === "admin"

  if (!isAuthorized && profile?.role === "vendor") {
    const { data: vendorRecord } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (vendorRecord && vendorRecord.id === suborder.vendor_id) {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return { success: false, error: "Not authorized to update this order" }
  }

  // Validate transition
  const currentStatus = suborder.status as SuborderStatus
  const allowed = VALID_SUBORDER_TRANSITIONS[currentStatus] || []

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}"`,
    }
  }

  // Update suborder
  const updates: Record<string, unknown> = { status: newStatus }
  if (trackingNumber) updates.tracking_number = trackingNumber

  const { error: updateError } = await supabase
    .from("suborders")
    .update(updates)
    .eq("id", suborderId)

  if (updateError) {
    return { success: false, error: "Failed to update order status" }
  }

  // Record event
  await supabase.from("order_events").insert({
    order_id: suborder.order_id,
    suborder_id: suborderId,
    event_type: "suborder_status_changed",
    old_status: currentStatus,
    new_status: newStatus,
    actor_id: user.id,
    notes: notes || null,
    metadata: trackingNumber ? JSON.stringify({ tracking_number: trackingNumber }) : null,
  })

  // ── Financial: credit wallet on delivery ──────────────────────
  if (newStatus === "delivered") {
    const { data: suborderDetails } = await supabase
      .from("suborders")
      .select("subtotal, commission_rate, commission_amount, delivery_charge, vendor_id")
      .eq("id", suborderId)
      .single()

    if (suborderDetails) {
      const sellerEarnings =
        suborderDetails.subtotal -
        suborderDetails.commission_amount +
        suborderDetails.delivery_charge

      if (sellerEarnings > 0) {
        await supabase.rpc("credit_vendor_wallet", {
          p_vendor_id: suborderDetails.vendor_id,
          p_amount: sellerEarnings,
          p_order_id: suborder.order_id,
          p_suborder_id: suborderId,
          p_description: `Earnings from order`,
          p_type: "sale",
          p_metadata: JSON.stringify({
            subtotal: suborderDetails.subtotal,
            commission_amount: suborderDetails.commission_amount,
            delivery_charge: suborderDetails.delivery_charge,
            commission_rate: suborderDetails.commission_rate,
          }),
        })

        await createAuditLog({
          action: "wallet.credited",
          entityType: "wallet",
          entityId: suborderDetails.vendor_id,
          metadata: {
            order_id: suborder.order_id,
            suborder_id: suborderId,
            amount: sellerEarnings,
          },
        })
      }

      // If commission was charged, record it as a separate ledger entry for clarity
      if (suborderDetails.commission_amount > 0) {
        await supabase.rpc("debit_vendor_wallet", {
          p_vendor_id: suborderDetails.vendor_id,
          p_amount: suborderDetails.commission_amount,
          p_order_id: suborder.order_id,
          p_suborder_id: suborderId,
          p_description: `Platform commission`,
          p_type: "commission",
          p_metadata: JSON.stringify({
            commission_rate: suborderDetails.commission_rate,
            subtotal: suborderDetails.subtotal,
          }),
        })
      }
    }

    // Check if ALL suborders for this master order are delivered
    const { data: allSuborders } = await supabase
      .from("suborders")
      .select("status")
      .eq("order_id", suborder.order_id)

    const allDelivered = (allSuborders || []).every(
      (s) => s.status === "delivered" || s.status === "cancelled",
    )
    const anyDelivered = (allSuborders || []).some((s) => s.status === "delivered")

    if (allDelivered && anyDelivered) {
      // All suborders delivered — complete the master order
      await supabase
        .from("orders")
        .update({
          status: "delivered",
          payment_status: "paid",
        })
        .eq("id", suborder.order_id)
    } else if (anyDelivered) {
      await supabase
        .from("orders")
        .update({ status: "partially_delivered" })
        .eq("id", suborder.order_id)
        .in("status", ["pending", "confirmed", "processing", "partially_shipped", "shipped"])
    }
  }

  // ── Financial: reverse wallet on post-delivery cancellation ───
  if (newStatus === "cancelled" && currentStatus === "delivered") {
    const { data: suborderDetails } = await supabase
      .from("suborders")
      .select("subtotal, commission_rate, commission_amount, delivery_charge, vendor_id")
      .eq("id", suborderId)
      .single()

    if (suborderDetails) {
      const reversalAmount =
        suborderDetails.subtotal -
        suborderDetails.commission_amount +
        suborderDetails.delivery_charge

      if (reversalAmount > 0) {
        await supabase.rpc("debit_vendor_wallet", {
          p_vendor_id: suborderDetails.vendor_id,
          p_amount: reversalAmount,
          p_order_id: suborder.order_id,
          p_suborder_id: suborderId,
          p_description: `Reversal for cancelled delivery`,
          p_type: "reversal",
          p_metadata: JSON.stringify({
            original_subtotal: suborderDetails.subtotal,
            original_commission: suborderDetails.commission_amount,
          }),
        })

        await createAuditLog({
          action: "financial.reversal",
          entityType: "wallet",
          entityId: suborderDetails.vendor_id,
          metadata: {
            order_id: suborder.order_id,
            suborder_id: suborderId,
            amount: reversalAmount,
          },
        })
      }

      // Reverse commission if it was charged
      if (suborderDetails.commission_amount > 0) {
        await supabase.rpc("credit_vendor_wallet", {
          p_vendor_id: suborderDetails.vendor_id,
          p_amount: suborderDetails.commission_amount,
          p_order_id: suborder.order_id,
          p_suborder_id: suborderId,
          p_description: `Commission reversal for cancelled order`,
          p_type: "reversal",
          p_metadata: JSON.stringify({
            original_commission_rate: suborderDetails.commission_rate,
          }),
        })
      }
    }
  }

  // Notify customer
  const { data: masterOrder } = await supabase
    .from("orders")
    .select("user_id")
    .eq("id", suborder.order_id)
    .single()

  if (masterOrder) {
    await supabase.from("notifications").insert({
      user_id: masterOrder.user_id,
      title: "Order status updated",
      message: `Your seller order has been updated to: ${newStatus.replace(/_/g, " ")}`,
      type: "order",
      link: `/orders/${suborder.order_id}`,
    })
  }

  return { success: true }
}

// Advance master order status (admin only)
export async function advanceMasterOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Admin access required" }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required" }
  }

  // Fetch current order
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single()

  if (fetchError || !order) {
    return { success: false, error: "Order not found" }
  }

  // Validate transition
  const currentStatus = order.status as OrderStatus
  const allowed = VALID_MASTER_TRANSITIONS[currentStatus] || []

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}"`,
    }
  }

  // Update order
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)

  if (updateError) {
    return { success: false, error: "Failed to update order status" }
  }

  // Record event
  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "order_status_changed",
    old_status: currentStatus,
    new_status: newStatus,
    actor_id: user.id,
    notes: notes || null,
  })

  // Notify customer
  const { data: masterOrder } = await supabase
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .single()

  if (masterOrder) {
    await supabase.from("notifications").insert({
      user_id: masterOrder.user_id,
      title: "Order status updated",
      message: `Your order has been updated to: ${newStatus.replace(/_/g, " ")}`,
      type: "order",
      link: `/orders/${orderId}`,
    })
  }

  return { success: true }
}

// Get order timeline events
export async function getOrderTimeline(orderId: string) {
  const supabase = await createServerClient()

  const { data: events, error } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching timeline:", error)
    return []
  }

  return events || []
}

// Cancel order (buyer-initiated, only pending orders)
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required" }
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .single()

  if (fetchError || !order) {
    return { success: false, error: "Order not found" }
  }

  if (order.user_id !== user.id) {
    return { success: false, error: "Not authorized" }
  }

  if (order.status !== "pending" && order.status !== "confirmed") {
    return { success: false, error: "Only pending or confirmed orders can be cancelled" }
  }

  // Update master order
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)

  if (updateError) {
    return { success: false, error: "Failed to cancel order" }
  }

  // Cancel all active suborders
  await supabase
    .from("suborders")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .not("status", "in", '("delivered","cancelled")')

  // Restore stock
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)

  if (orderItems) {
    for (const item of orderItems) {
      await supabase.rpc("increment_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }
  }

  // Record event
  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "order_cancelled",
    old_status: order.status,
    new_status: "cancelled",
    actor_id: user.id,
  })

  return { success: true }
}

// Reorder - add all items from a previous order to cart
export async function reorderOrder(orderId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required" }
  }

  // Fetch order items
  const { data: orderItems, error: fetchError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)

  if (fetchError || !orderItems || orderItems.length === 0) {
    return { success: false, error: "No items found in this order" }
  }

  // Upsert all items to cart
  const cartItems = orderItems.map((item) => ({
    user_id: user.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }))

  const { error: upsertError } = await supabase
    .from("cart_items")
    .upsert(cartItems, { onConflict: "user_id,product_id" })

  if (upsertError) {
    return { success: false, error: "Failed to add items to cart" }
  }

  return { success: true }
}
