"use server"

import { requireAuth, requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { payoutRequestSchema } from "@/lib/validation"

interface ActionResult {
  success: boolean
  error?: string
  payoutId?: string
}

export async function requestPayout(
  amount: number,
  paymentMethod: string,
  notes?: string,
): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = payoutRequestSchema.safeParse({ amount, payment_method: paymentMethod, notes })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  // Get vendor ID and wallet balance
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, status")
    .eq("user_id", user.id)
    .single()

  if (!vendor || vendor.status !== "approved") {
    return { success: false, error: "You must be an approved vendor" }
  }

  const { data: wallet } = await supabase
    .from("seller_wallets")
    .select("balance")
    .eq("vendor_id", vendor.id)
    .single()

  if (!wallet || wallet.balance < amount) {
    return { success: false, error: "Insufficient balance" }
  }

  // Check for existing pending payout
  const { data: existingPayout } = await supabase
    .from("payouts")
    .select("id")
    .eq("vendor_id", vendor.id)
    .eq("status", "pending")
    .single()

  if (existingPayout) {
    return { success: false, error: "You already have a pending payout request" }
  }

  const { data, error } = await supabase
    .from("payouts")
    .insert({
      vendor_id: vendor.id,
      amount,
      payment_method: paymentMethod,
      notes: notes || null,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: "Failed to create payout request" }
  }

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "New payout request",
      message: `A vendor has requested a payout of Rs. ${amount.toLocaleString()}`,
      type: "payment" as const,
      link: "/admin",
    }))
    await supabase.from("notifications").insert(notifications)
  }

  return { success: true, payoutId: data.id }
}

export async function reviewPayout(
  payoutId: string,
  status: "approved" | "completed" | "failed" | "cancelled",
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  const { data: payout } = await supabase
    .from("payouts")
    .select("*, vendors!inner(user_id, store_name)")
    .eq("id", payoutId)
    .single()

  if (!payout) {
    return { success: false, error: "Payout not found" }
  }

  if (payout.status !== "pending" && payout.status !== "processing" && payout.status !== "approved") {
    return { success: false, error: "This payout has already been processed" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from("payouts")
    .update({
      status,
      processed_by: user?.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", payoutId)

  if (error) {
    return { success: false, error: "Failed to update payout" }
  }

  // If completed, deduct from wallet using atomic RPC
  if (status === "completed") {
    const { error: walletError } = await supabase.rpc("debit_vendor_wallet", {
      p_vendor_id: payout.vendor_id,
      p_amount: payout.amount,
      p_order_id: null,
      p_suborder_id: null,
      p_description: `Payout #${payoutId.slice(0, 8)}`,
      p_type: "payout",
      p_metadata: JSON.stringify({ payout_id: payoutId }),
    })

    if (walletError) {
      console.error("Wallet debit failed:", walletError)
      // Revert payout status
      await supabase
        .from("payouts")
        .update({ status: "approved" })
        .eq("id", payoutId)
      return { success: false, error: "Wallet deduction failed. Payout not processed." }
    }

    await createAuditLog({
      action: "wallet.debited",
      entityType: "wallet",
      entityId: payout.vendor_id,
      metadata: { payout_id: payoutId, amount: payout.amount },
    })
  }

  await createAuditLog({
    action: status === "completed" || status === "approved" ? "payout.approved" : "payout.rejected",
    entityType: "payout",
    entityId: payoutId,
    oldValue: { status: payout.status },
    newValue: { status },
    metadata: {
      amount: payout.amount,
      store_name: (payout.vendors as unknown as { store_name: string })?.store_name,
    },
  })

  // Notify the vendor
  const vendor = payout.vendors as unknown as { user_id: string } | null
  if (vendor?.user_id) {
    await supabase.from("notifications").insert({
      user_id: vendor.user_id,
      title: status === "completed" ? "Payout processed" : "Payout request denied",
      message:
        status === "completed"
          ? `Your payout of Rs. ${payout.amount.toLocaleString()} has been processed.`
          : `Your payout request of Rs. ${payout.amount.toLocaleString()} was ${status}.`,
      type: "payment",
      link: "/vendor",
    })
  }

  return { success: true }
}
