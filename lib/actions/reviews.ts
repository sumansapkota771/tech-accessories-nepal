"use server"

import { requireAuth, requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { reviewSchema, reviewUpdateSchema, reviewReportSchema } from "@/lib/validation"

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

// ============================================================
// createReview – verified-purchase only, rate-limited
// ============================================================
export async function createReview(
  productId: string,
  rating: number,
  comment?: string,
  images?: string[],
): Promise<ActionResult<{ reviewId: string }>> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = reviewSchema.safeParse({
    product_id: productId,
    rating,
    comment,
    images,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  // Server-side verified purchase check (defense in depth alongside RLS)
  const { data: purchasedItems, error: purchaseError } = await supabase
    .from("order_items")
    .select("id, orders!inner(user_id, status), suborders(status)")
    .eq("product_id", productId)
    .eq("orders.user_id", user.id)

  if (purchaseError) {
    return { success: false, error: "Failed to verify purchase" }
  }

  const hasDelivered = (purchasedItems || []).some((item: Record<string, unknown>) => {
    const suborders = item.suborders as { status: string } | null
    const orders = item.orders as { status: string } | null
    return suborders?.status === "delivered" || (!suborders && orders?.status === "delivered")
  })

  if (!hasDelivered) {
    return { success: false, error: "You can only review products you have received" }
  }

  // Check for existing review (UNIQUE constraint also enforces this)
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .single()

  if (existing) {
    return { success: false, error: "You have already reviewed this product" }
  }

  const { data: review, error: insertError } = await supabase
    .from("reviews")
    .insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment?.trim() || null,
      images: images && images.length > 0 ? images : null,
    })
    .select("id")
    .single()

  if (insertError) {
    // Handle rate limit error gracefully
    if (insertError.message?.includes("Rate limit")) {
      return { success: false, error: "You are reviewing too quickly. Please wait a moment." }
    }
    return { success: false, error: "Failed to post review" }
  }

  return { success: true, data: { reviewId: review.id } }
}

// ============================================================
// editReview – owner only, tracks edit timestamp
// ============================================================
export async function editReview(
  reviewId: string,
  updates: { rating?: number; comment?: string; images?: string[] },
): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = reviewUpdateSchema.safeParse(updates)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  // Verify ownership
  const { data: review, error: fetchError } = await supabase
    .from("reviews")
    .select("id, user_id")
    .eq("id", reviewId)
    .single()

  if (fetchError || !review) {
    return { success: false, error: "Review not found" }
  }

  if (review.user_id !== user.id) {
    return { success: false, error: "You can only edit your own reviews" }
  }

  const updateData: Record<string, unknown> = { edited_at: new Date().toISOString() }
  if (updates.rating !== undefined) updateData.rating = updates.rating
  if (updates.comment !== undefined) updateData.comment = updates.comment.trim() || null
  if (updates.images !== undefined) updateData.images = updates.images.length > 0 ? updates.images : null

  const { error: updateError } = await supabase
    .from("reviews")
    .update(updateData)
    .eq("id", reviewId)

  if (updateError) {
    return { success: false, error: "Failed to update review" }
  }

  return { success: true }
}

// ============================================================
// deleteReview – owner or admin
// ============================================================
export async function deleteReview(reviewId: string): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  // Get the review
  const { data: review, error: fetchError } = await supabase
    .from("reviews")
    .select("id, user_id")
    .eq("id", reviewId)
    .single()

  if (fetchError || !review) {
    return { success: false, error: "Review not found" }
  }

  // Check if user is owner or admin
  const isOwner = review.user_id === user.id
  if (!isOwner) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return { success: false, error: "You can only delete your own reviews" }
    }
  }

  const { error: deleteError } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)

  if (deleteError) {
    return { success: false, error: "Failed to delete review" }
  }

  if (!isOwner) {
    await createAuditLog({
      action: "review.moderated",
      entityType: "review",
      entityId: reviewId,
      metadata: { moderation_action: "delete", actor: user.id },
    })
  }

  return { success: true }
}

// ============================================================
// reportReview – any authenticated user, one report per user
// ============================================================
export async function reportReview(
  reviewId: string,
  reason: "spam" | "inappropriate" | "fake" | "offensive" | "fraud" | "irrelevant" | "personal_info" | "other",
  description?: string,
): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = reviewReportSchema.safeParse({ review_id: reviewId, reason, description })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  // Check for duplicate report (UNIQUE constraint also enforces this)
  const { data: existing } = await supabase
    .from("review_reports")
    .select("id")
    .eq("review_id", reviewId)
    .eq("reported_by", user.id)
    .single()

  if (existing) {
    return { success: false, error: "You have already reported this review" }
  }

  // Verify the review exists and user isn't reporting their own review
  const { data: review } = await supabase
    .from("reviews")
    .select("id, user_id")
    .eq("id", reviewId)
    .single()

  if (!review) {
    return { success: false, error: "Review not found" }
  }

  if (review.user_id === user.id) {
    return { success: false, error: "You cannot report your own review" }
  }

  const { error } = await supabase.from("review_reports").insert({
    review_id: reviewId,
    reported_by: user.id,
    reason,
    description: description?.trim() || null,
  })

  if (error) {
    return { success: false, error: "Failed to submit report" }
  }

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "New review report",
      message: `A review has been reported for: ${reason}`,
      type: "review" as const,
      link: "/admin",
    }))
    await supabase.from("notifications").insert(notifications)
  }

  return { success: true }
}

// ============================================================
// replyToReview – vendor on their own products
// ============================================================
export async function replyToReview(
  reviewId: string,
  content: string,
): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  if (!content.trim()) {
    return { success: false, error: "Reply content cannot be empty" }
  }

  const supabase = await createServerClient()

  // Verify user is a vendor and owns the product being reviewed
  const { data: review } = await supabase
    .from("reviews")
    .select("product_id, products!inner(vendor_id)")
    .eq("id", reviewId)
    .single()

  if (!review) {
    return { success: false, error: "Review not found" }
  }

  const product = review.products as unknown as { vendor_id: string } | null
  if (!product?.vendor_id) {
    return { success: false, error: "This review is not for a vendor product" }
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", product.vendor_id)
    .single()

  if (!vendor) {
    return { success: false, error: "You can only reply to reviews on your own products" }
  }

  // Check if vendor already replied
  const { data: existingReply } = await supabase
    .from("review_replies")
    .select("id")
    .eq("review_id", reviewId)
    .eq("vendor_id", vendor.id)
    .single()

  if (existingReply) {
    return { success: false, error: "You have already replied to this review" }
  }

  const { error } = await supabase.from("review_replies").insert({
    review_id: reviewId,
    vendor_id: vendor.id,
    user_id: user.id,
    content: content.trim(),
  })

  if (error) {
    return { success: false, error: "Failed to post reply" }
  }

  return { success: true }
}

// ============================================================
// moderateReview – admin only (flag/unflag/hide/restore/delete)
// ============================================================
export async function moderateReview(
  reviewId: string,
  action: "flag" | "unflag" | "hide" | "restore" | "delete",
  reason?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (action === "delete") {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId)
    if (error) return { success: false, error: "Failed to delete review" }
  } else {
    const updateData: Record<string, unknown> = {}
    if (action === "flag" || action === "unflag") {
      updateData.is_flagged = action === "flag"
    }
    if (action === "hide" || action === "restore") {
      updateData.is_hidden = action === "hide"
    }

    const { error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", reviewId)
    if (error) return { success: false, error: "Failed to update review" }
  }

  await createAuditLog({
    action: "review.moderated",
    entityType: "review",
    entityId: reviewId,
    metadata: { moderation_action: action, reason: reason || null, actor: user?.id },
  })

  return { success: true }
}

// ============================================================
// resolveReport – admin only
// ============================================================
export async function resolveReport(
  reportId: string,
  action: "resolve" | "dismiss",
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const newStatus = action === "resolve" ? "resolved" : "dismissed"

  const { error } = await supabase
    .from("review_reports")
    .update({
      status: newStatus,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)

  if (error) {
    return { success: false, error: "Failed to update report" }
  }

  await createAuditLog({
    action: "review.report_resolved",
    entityType: "review",
    entityId: reportId,
    metadata: { resolution: newStatus, actor: user?.id },
  })

  return { success: true }
}
