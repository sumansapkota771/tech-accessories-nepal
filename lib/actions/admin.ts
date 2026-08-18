"use server"

import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface ActionResult {
  success: boolean
  error?: string
}

// ============================================================
// updateUserRole – admin only
// ============================================================
export async function updateUserRole(
  userId: string,
  newRole: "user" | "vendor" | "admin",
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  if (!["user", "vendor", "admin"].includes(newRole)) {
    return { success: false, error: "Invalid role" }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .single()

  if (!profile) {
    return { success: false, error: "User not found" }
  }

  if (profile.role === newRole) {
    return { success: false, error: "User already has this role" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)

  if (error) {
    return { success: false, error: "Failed to update role" }
  }

  await createAuditLog({
    action: "admin.role_changed",
    entityType: "profile",
    entityId: userId,
    oldValue: { role: profile.role },
    newValue: { role: newRole },
    metadata: { actor: user?.id, user_name: profile.full_name },
  })

  revalidatePath("/admin")
  return { success: true }
}

// ============================================================
// suspendUser – admin only (soft-suspend via metadata)
// ============================================================
export async function suspendUser(
  userId: string,
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

  // Check if user is a vendor — if so, suspend the vendor record
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, status")
    .eq("user_id", userId)
    .single()

  if (vendor && vendor.status === "approved") {
    const { error } = await supabase
      .from("vendors")
      .update({
        status: "suspended",
        rejection_reason: reason || "Suspended by admin",
      })
      .eq("id", vendor.id)

    if (error) {
      return { success: false, error: "Failed to suspend vendor" }
    }

    await createAuditLog({
      action: "vendor.suspended",
      entityType: "vendor",
      entityId: vendor.id,
      oldValue: { status: vendor.status },
      newValue: { status: "suspended" },
      metadata: { reason, actor: user?.id },
    })
  }

  revalidatePath("/admin")
  return { success: true }
}

// ============================================================
// createVendorForUser – admin only
// ============================================================
export async function createVendorForUser(
  userEmail: string,
  storeName: string,
  commissionRate: number = 10.0,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  // Find user by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("email", userEmail)
    .single()

  if (!profile) {
    return { success: false, error: "User not found with this email" }
  }

  if (profile.role === "admin") {
    return { success: false, error: "Cannot make an admin a vendor" }
  }

  // Check if already a vendor
  const { data: existingVendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", profile.id)
    .single()

  if (existingVendor) {
    return { success: false, error: "User is already a vendor" }
  }

  // Generate slug
  const slug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  // Create vendor
  const { error: vendorError } = await supabase.from("vendors").insert({
    user_id: profile.id,
    store_name: storeName,
    slug,
    status: "approved",
    commission_rate: commissionRate,
  })

  if (vendorError) {
    return { success: false, error: "Failed to create vendor" }
  }

  // Update user role
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "vendor" })
    .eq("id", profile.id)

  if (roleError) {
    return { success: false, error: "Failed to update user role" }
  }

  await createAuditLog({
    action: "vendor.approved",
    entityType: "vendor",
    metadata: {
      created_by_admin: true,
      user_email: userEmail,
      store_name: storeName,
      commission_rate: commissionRate,
      actor: adminUser?.id,
    },
  })

  // Notify the user
  await supabase.from("notifications").insert({
    user_id: profile.id,
    title: "Vendor account created",
    message: `Your vendor account "${storeName}" has been created and approved by an administrator.`,
    type: "system",
    link: "/vendor",
  })

  revalidatePath("/admin")
  return { success: true }
}

// ============================================================
// updateProductAdmin – admin only (full product edit)
// ============================================================
export async function updateProductAdmin(
  productId: string,
  updates: {
    name?: string
    description?: string | null
    price?: number
    original_price?: number | null
    stock_quantity?: number
    category_id?: string | null
    image_url?: string | null
    is_active?: boolean
    is_featured?: boolean
    brand?: string | null
    sku?: string | null
    condition?: string
    warranty?: string | null
    low_stock_threshold?: number
  },
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

  // Fetch current product
  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .single()

  if (!product) {
    return { success: false, error: "Product not found" }
  }

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)

  if (error) {
    return { success: false, error: "Failed to update product" }
  }

  await createAuditLog({
    action: "product.updated",
    entityType: "product",
    entityId: productId,
    newValue: updates,
    metadata: { actor: user?.id, product_name: product.name },
  })

  revalidatePath("/admin")
  return { success: true }
}

// ============================================================
// getAdminDashboardStats – real metrics
// ============================================================
export async function getAdminDashboardStats() {
  try {
    await requireAdmin()
  } catch {
    return null
  }

  const supabase = await createServerClient()

  const [
    buyersResult,
    vendorsResult,
    pendingVendorsResult,
    productsResult,
    pendingQcResult,
    ordersResult,
    revenueResult,
    pendingPayoutsResult,
    reviewsResult,
    reportsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user"),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("is_deleted", false),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "under_review"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("product_status", "pending")
      .eq("is_deleted", false),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("suborders")
      .select("subtotal, commission_amount, delivery_charge"),
    supabase
      .from("payouts")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "approved"]),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("review_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ])

  const suborders = revenueResult.data || []
  const revenue = suborders.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0)
  const platformFees = suborders.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0)
  const gmv = revenue + platformFees + suborders.reduce((sum, s) => sum + (Number(s.delivery_charge) || 0), 0)

  return {
    totalBuyers: buyersResult.count || 0,
    activeSellers: vendorsResult.count || 0,
    pendingSellers: pendingVendorsResult.count || 0,
    totalProducts: productsResult.count || 0,
    pendingQc: pendingQcResult.count || 0,
    totalOrders: ordersResult.count || 0,
    revenue,
    gmv,
    platformFees,
    pendingPayouts: pendingPayoutsResult.count || 0,
    totalReviews: reviewsResult.count || 0,
    pendingReports: reportsResult.count || 0,
  }
}
