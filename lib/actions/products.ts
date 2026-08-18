"use server"

import { requireAdmin, requireVendor, getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { productSchema, qcReviewSchema } from "@/lib/validation"
import type { ProductStatus } from "@/lib/types"

interface ActionResult {
  success: boolean
  error?: string
  productId?: string
}

// ============================================================
// Vendor: Create product (draft or submit for QC)
// ============================================================
export async function createProduct(
  data: Record<string, unknown>,
): Promise<ActionResult> {
  let user
  try {
    user = await requireVendor()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = productSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  // Get vendor ID
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .single()

  if (!vendor) {
    return { success: false, error: "You must be an approved vendor to create products" }
  }

  const productData = parsed.data

  const { data: newProduct, error } = await supabase
    .from("products")
    .insert({
      name: productData.name,
      description: productData.description || null,
      price: productData.price,
      original_price: productData.original_price || null,
      category_id: productData.category_id || null,
      vendor_id: vendor.id,
      stock_quantity: productData.stock_quantity,
      is_featured: productData.is_featured ?? false,
      is_active: productData.product_status === "draft" ? false : true,
      specifications: productData.specifications || null,
      image_url: productData.image_url || null,
      images: productData.images || null,
      brand: productData.brand || null,
      sku: productData.sku || null,
      condition: productData.condition || "new",
      warranty: productData.warranty || null,
      video_url: productData.video_url || null,
      delivery_info: productData.delivery_info || null,
      low_stock_threshold: productData.low_stock_threshold ?? 5,
      variants: productData.variants || null,
      product_status: productData.product_status || "pending",
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: "Failed to create product" }
  }

  await createAuditLog({
    action: "product.created",
    entityType: "product",
    entityId: newProduct.id,
    newValue: {
      name: productData.name,
      product_status: productData.product_status,
      price: productData.price,
    },
  })

  return { success: true, productId: newProduct.id }
}

// ============================================================
// Vendor: Update product
// ============================================================
export async function updateProduct(
  productId: string,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  let user
  try {
    user = await requireVendor()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  // Verify ownership
  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, vendor_id, product_status, name")
    .eq("id", productId)
    .single()

  if (!existingProduct) {
    return { success: false, error: "Product not found" }
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .single()

  if (!vendor || existingProduct.vendor_id !== vendor.id) {
    return { success: false, error: "Unauthorized" }
  }

  const updateData: Record<string, unknown> = { ...data }
  delete updateData.product_status // Status managed by separate actions

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)

  if (error) {
    return { success: false, error: "Failed to update product" }
  }

  await createAuditLog({
    action: "product.updated",
    entityType: "product",
    entityId: productId,
    newValue: updateData,
  })

  return { success: true }
}

// ============================================================
// Vendor: Submit product for QC review
// ============================================================
export async function submitProductForQC(productId: string): Promise<ActionResult> {
  let user
  try {
    user = await requireVendor()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, vendor_id, product_status, name")
    .eq("id", productId)
    .single()

  if (!existingProduct) {
    return { success: false, error: "Product not found" }
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .single()

  if (!vendor || existingProduct.vendor_id !== vendor.id) {
    return { success: false, error: "Unauthorized" }
  }

  if (!["draft", "qc_changes_requested", "qc_rejected"].includes(existingProduct.product_status)) {
    return { success: false, error: "Product cannot be submitted for review in its current status" }
  }

  // Use transition function
  const { error } = await supabase.rpc("transition_product_status", {
    p_product_id: productId,
    p_new_status: "pending",
  })

  if (error) {
    return { success: false, error: "Failed to submit for review" }
  }

  // Create QC check record
  await supabase.from("product_quality_checks").insert({
    product_id: productId,
    submitted_by: user.id,
    status: "pending",
  })

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "New product submitted for review",
      message: `A vendor has submitted "${existingProduct.name}" for quality review.`,
      type: "product" as const,
      link: "/admin",
    }))
    await supabase.from("notifications").insert(notifications)
  }

  await createAuditLog({
    action: "product.submitted_for_qc",
    entityType: "product",
    entityId: productId,
    newValue: { product_status: "pending" },
  })

  return { success: true }
}

// ============================================================
// Admin: Review product QC (approve, request changes, reject)
// ============================================================
export async function reviewProductQC(
  productId: string,
  action: "approve" | "request_changes" | "reject",
  notes?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = qcReviewSchema.safeParse({
    product_id: productId,
    action,
    notes,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, product_status, name, vendor_id")
    .eq("id", productId)
    .single()

  if (!existingProduct) {
    return { success: false, error: "Product not found" }
  }

  if (existingProduct.product_status !== "pending") {
    return { success: false, error: "Product is not pending review" }
  }

  let newStatus: ProductStatus
  switch (action) {
    case "approve":
      newStatus = "approved"
      break
    case "request_changes":
      newStatus = "qc_changes_requested"
      break
    case "reject":
      newStatus = "qc_rejected"
      break
  }

  // Update QC notes
  const updateData: Record<string, unknown> = {
    product_status: newStatus,
    qc_notes: notes || null,
  }

  if (action === "reject") {
    updateData.rejection_reason = notes || null
  }

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)

  if (error) {
    return { success: false, error: "Failed to update product status" }
  }

  // Update QC check record
  const { data: qcCheck } = await supabase
    .from("product_quality_checks")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (qcCheck) {
    const qcStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "in_review"
    await supabase
      .from("product_quality_checks")
      .update({
        status: qcStatus,
        rejection_reason: action === "reject" ? notes : null,
        reviewer_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", qcCheck.id)
  }

  // Notify vendor
  if (existingProduct.vendor_id) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("id", existingProduct.vendor_id)
      .single()

    if (vendor) {
      const statusMessages: Record<string, string> = {
        approve: `Your product "${existingProduct.name}" has been approved and is now live.`,
        request_changes: `Your product "${existingProduct.name}" needs changes. ${notes || ""}`,
        reject: `Your product "${existingProduct.name}" was rejected. ${notes || ""}`,
      }
      await supabase.from("notifications").insert({
        user_id: vendor.user_id,
        title: action === "approve" ? "Product approved" : action === "request_changes" ? "Changes requested" : "Product rejected",
        message: statusMessages[action],
        type: "product",
        link: "/vendor",
      })
    }
  }

  await createAuditLog({
    action: `product.qc.${action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes_requested"}`,
    entityType: "product",
    entityId: productId,
    oldValue: { product_status: existingProduct.product_status },
    newValue: { product_status: newStatus, qc_notes: notes },
  })

  return { success: true }
}

// ============================================================
// Admin: Update product status (suspend, publish, etc.)
// ============================================================
export async function updateProductStatus(
  productId: string,
  newStatus: ProductStatus,
  reason?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, product_status, name, vendor_id")
    .eq("id", productId)
    .single()

  if (!existingProduct) {
    return { success: false, error: "Product not found" }
  }

  const { error } = await supabase.rpc("transition_product_status", {
    p_product_id: productId,
    p_new_status: newStatus,
    p_notes: reason || null,
  })

  if (error) {
    return { success: false, error: `Cannot transition product from ${existingProduct.product_status} to ${newStatus}` }
  }

  // Notify vendor
  if (existingProduct.vendor_id) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("id", existingProduct.vendor_id)
      .single()

    if (vendor) {
      const statusLabels: Record<string, string> = {
        published: "published",
        unpublished: "unpublished",
        suspended: "suspended",
        deleted: "deleted",
        approved: "approved",
      }
      await supabase.from("notifications").insert({
        user_id: vendor.user_id,
        title: `Product ${statusLabels[newStatus] || newStatus}`,
        message: `Your product "${existingProduct.name}" has been ${statusLabels[newStatus] || newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
        type: "product",
        link: "/vendor",
      })
    }
  }

  await createAuditLog({
    action: `product.status_changed`,
    entityType: "product",
    entityId: productId,
    oldValue: { product_status: existingProduct.product_status },
    newValue: { product_status: newStatus, reason },
  })

  return { success: true }
}

// ============================================================
// Admin: Delete product (soft delete via status)
// ============================================================
export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  const { data: existingProduct } = await supabase
    .from("products")
    .select("name, product_status")
    .eq("id", productId)
    .single()

  const { error } = await supabase
    .from("products")
    .update({
      product_status: "deleted",
      is_active: false,
      is_deleted: true,
    })
    .eq("id", productId)

  if (error) {
    return { success: false, error: "Failed to delete product" }
  }

  await createAuditLog({
    action: "product.deleted",
    entityType: "product",
    entityId: productId,
    oldValue: { product_status: existingProduct?.product_status },
    newValue: { product_status: "deleted" },
    metadata: { product_name: existingProduct?.name },
  })

  return { success: true }
}
