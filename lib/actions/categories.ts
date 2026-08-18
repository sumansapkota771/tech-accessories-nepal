"use server"

import { requireAuth, requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { categoryRequestSchema, categorySchema } from "@/lib/validation"

interface ActionResult {
  success: boolean
  error?: string
  requestId?: string
}

export async function requestCategory(
  requestedName: string,
  description?: string,
  parentCategoryId?: string,
): Promise<ActionResult> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = categoryRequestSchema.safeParse({
    requested_name: requestedName,
    description,
    parent_category_id: parentCategoryId,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from("category_requests")
    .select("id")
    .eq("requested_name", requestedName)
    .eq("status", "pending")
    .single()

  if (existing) {
    return { success: false, error: "You already have a pending request for this category" }
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!vendor) {
    return { success: false, error: "You must be a vendor to request categories" }
  }

  const { data, error } = await supabase
    .from("category_requests")
    .insert({
      vendor_id: vendor.id,
      requested_name: requestedName,
      description: description || null,
      parent_category_id: parentCategoryId || null,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: "Failed to submit category request" }
  }

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "New category request",
      message: `A vendor has requested a new category: "${requestedName}"`,
      type: "system" as const,
      link: "/admin",
    }))
    await supabase.from("notifications").insert(notifications)
  }

  return { success: true, requestId: data.id }
}

export async function reviewCategoryRequest(
  requestId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  if (status === "rejected" && !rejectionReason) {
    return { success: false, error: "Rejection reason is required" }
  }

  const supabase = await createServerClient()

  const { data: request } = await supabase
    .from("category_requests")
    .select("*, vendors!inner(user_id)")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Request not found" }
  }

  const updateData: Record<string, unknown> = {
    status,
    reviewed_by: (await supabase.auth.getUser()).data.user?.id,
    reviewed_at: new Date().toISOString(),
  }

  if (status === "rejected") {
    updateData.rejection_reason = rejectionReason
  }

  if (status === "approved") {
    const slug = request.requested_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    const { data: newCategory, error: catError } = await supabase
      .from("categories")
      .insert({
        name: request.requested_name,
        description: request.description,
        slug,
        parent_category_id: request.parent_category_id || null,
      })
      .select("id")
      .single()

    if (catError) {
      return { success: false, error: "Failed to create category" }
    }

    updateData.created_category_id = newCategory.id
  }

  const { error } = await supabase
    .from("category_requests")
    .update(updateData)
    .eq("id", requestId)

  if (error) {
    return { success: false, error: "Failed to update request" }
  }

  await createAuditLog({
    action: status === "approved" ? "category.request_approved" : "category.request_rejected",
    entityType: "category_request",
    entityId: requestId,
    newValue: { status, rejection_reason: rejectionReason },
    metadata: { requested_name: request.requested_name },
  })

  const vendor = request.vendors as unknown as { user_id: string } | null
  if (vendor?.user_id) {
    await supabase.from("notifications").insert({
      user_id: vendor.user_id,
      title: status === "approved" ? "Category request approved" : "Category request rejected",
      message:
        status === "approved"
          ? `Your category "${request.requested_name}" has been created and is now available.`
          : `Your category request "${request.requested_name}" was rejected. ${rejectionReason || ""}`,
      type: "system",
      link: "/vendor",
    })
  }

  return { success: true }
}

export async function createCategory(
  name: string,
  description?: string,
  parentId?: string,
  sortOrder?: number,
  metaTitle?: string,
  metaDescription?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const parsed = categorySchema.safeParse({
    name,
    description,
    slug,
    parent_id: parentId || null,
    sort_order: sortOrder ?? 0,
    meta_title: metaTitle || null,
    meta_description: metaDescription || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .single()

  if (existing) {
    return { success: false, error: "A category with this name already exists" }
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      description: description || null,
      slug,
      parent_id: parentId || null,
      sort_order: sortOrder ?? 0,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: "Failed to create category" }
  }

  await createAuditLog({
    action: "category.created",
    entityType: "category",
    entityId: data.id,
    newValue: { name, description, slug, parent_id: parentId },
  })

  return { success: true }
}

export async function updateCategory(
  categoryId: string,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  // If name changed, regenerate slug
  if (data.name && typeof data.name === "string") {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const { error } = await supabase
    .from("categories")
    .update(data)
    .eq("id", categoryId)

  if (error) {
    return { success: false, error: "Failed to update category" }
  }

  await createAuditLog({
    action: "category.updated",
    entityType: "category",
    entityId: categoryId,
    newValue: data,
  })

  return { success: true }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createServerClient()

  // Check for subcategories
  const { data: subcategories } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId)
    .limit(1)

  if (subcategories && subcategories.length > 0) {
    return { success: false, error: "Cannot delete category with subcategories. Remove subcategories first." }
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)

  if (error) {
    return { success: false, error: "Failed to delete category" }
  }

  await createAuditLog({
    action: "category.deleted",
    entityType: "category",
    entityId: categoryId,
  })

  return { success: true }
}
