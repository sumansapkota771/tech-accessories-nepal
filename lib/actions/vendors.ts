"use server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createServerClient } from "@/lib/supabase/server"
import { vendorApplicationSchema, vendorAdminUpdateSchema } from "@/lib/validation"

interface ActionResult {
  success: boolean
  error?: string
}

export async function submitVendorApplication(formData: {
  full_name: string
  email: string
  phone: string
  location: string
  store_name: string
  slug: string
  description?: string
  address: string
  logo_url?: string
  banner_url?: string
  pan_number: string
  pan_file_url: string
  vat_number?: string
  vat_file_url?: string
  business_registration_number?: string
  self_delivery_confirmed: boolean
  delivery_areas?: string[]
  delivery_charge?: number
  estimated_delivery_time?: string
  free_delivery_threshold?: number
}): Promise<ActionResult> {
  try {
    const user = await requireAuth()

    const parsed = vendorApplicationSchema.safeParse({
      ...formData,
      terms_accepted: true,
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
    }

    const supabase = await createServerClient()

    const { data: existing } = await supabase
      .from("vendors")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === "approved") {
        return { success: false, error: "You already have an approved store" }
      }
      const { error } = await supabase
        .from("vendors")
        .update({
          store_name: formData.store_name,
          slug: formData.slug,
          description: formData.description || null,
          phone: formData.phone,
          address: formData.address,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          full_name: formData.full_name,
          location: formData.location,
          pan_number: formData.pan_number,
          pan_file_url: formData.pan_file_url,
          vat_number: formData.vat_number || null,
          vat_file_url: formData.vat_file_url || null,
          business_registration_number: formData.business_registration_number || null,
          self_delivery_confirmed: formData.self_delivery_confirmed,
          self_delivery_confirmed_at: formData.self_delivery_confirmed ? new Date().toISOString() : null,
          delivery_areas: formData.delivery_areas || [],
          delivery_charge: formData.delivery_charge || 0,
          estimated_delivery_time: formData.estimated_delivery_time || null,
          free_delivery_threshold: formData.free_delivery_threshold || 0,
          status: "pending",
          rejection_reason: null,
          rejected_at: null,
        })
        .eq("id", existing.id)

      if (error) {
        console.error("Error updating vendor application:", error)
        return { success: false, error: "Failed to update application" }
      }
      return { success: true }
    }

    const { error: vendorError } = await supabase.from("vendors").insert({
      user_id: user.id,
      store_name: formData.store_name,
      slug: formData.slug,
      description: formData.description || null,
      phone: formData.phone,
      address: formData.address,
      logo_url: formData.logo_url || null,
      banner_url: formData.banner_url || null,
      full_name: formData.full_name,
      location: formData.location,
      pan_number: formData.pan_number,
      pan_file_url: formData.pan_file_url,
      vat_number: formData.vat_number || null,
      vat_file_url: formData.vat_file_url || null,
      business_registration_number: formData.business_registration_number || null,
      self_delivery_confirmed: formData.self_delivery_confirmed,
      self_delivery_confirmed_at: formData.self_delivery_confirmed ? new Date().toISOString() : null,
      delivery_areas: formData.delivery_areas || [],
      delivery_charge: formData.delivery_charge || 0,
      estimated_delivery_time: formData.estimated_delivery_time || null,
      free_delivery_threshold: formData.free_delivery_threshold || 0,
      status: "pending",
    })

    if (vendorError) {
      console.error("Error creating vendor application:", vendorError)
      return { success: false, error: "Failed to submit application" }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "vendor" })
      .eq("id", user.id)

    if (profileError) {
      console.error("Error updating profile role:", profileError)
    }

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")

    if (adminProfiles && adminProfiles.length > 0) {
      const notifications = adminProfiles.map((admin) => ({
        user_id: admin.id,
        title: "New seller application",
        message: `${formData.store_name} has applied to sell on the marketplace.`,
        type: "system" as const,
        link: "/admin",
      }))
      await supabase.from("notifications").insert(notifications)
    }

    return { success: true }
  } catch (error) {
    console.error("Error submitting vendor application:", error)
    return { success: false, error: "Failed to submit application" }
  }
}

export async function updateVendorStatus(
  vendorId: string,
  status: "pending" | "under_review" | "approved" | "rejected" | "suspended" | "blocked" | "expired",
  rejectionReason?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = vendorAdminUpdateSchema.safeParse({ status, rejection_reason: rejectionReason })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" }
  }

  const supabase = await createServerClient()

  const { data: currentVendor } = await supabase
    .from("vendors")
    .select("status, store_name, user_id")
    .eq("id", vendorId)
    .single()

  const updateData: Record<string, unknown> = { status }
  if (status === "rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason
    updateData.rejected_at = new Date().toISOString()
  }
  if (status === "under_review") {
    updateData.under_review_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("vendors")
    .update(updateData)
    .eq("id", vendorId)

  if (error) {
    return { success: false, error: "Failed to update vendor status" }
  }

  const actionMap: Record<string, string> = {
    approved: "vendor.approved",
    rejected: "vendor.rejected",
    suspended: "vendor.suspended",
  }

  if (actionMap[status]) {
    await createAuditLog({
      action: actionMap[status] as "vendor.approved" | "vendor.rejected" | "vendor.suspended",
      entityType: "vendor",
      entityId: vendorId,
      oldValue: { status: currentVendor?.status },
      newValue: { status, rejection_reason: rejectionReason },
      metadata: { store_name: currentVendor?.store_name },
    })
  }

  const notificationMap: Record<string, { title: string; message: string }> = {
    approved: {
      title: "Your store has been approved!",
      message: "Congratulations! Your store is now live. A 3-month zero-commission promotion has been activated.",
    },
    rejected: {
      title: "Your store application was not approved",
      message: rejectionReason
        ? `Reason: ${rejectionReason}. You can reapply with corrected information.`
        : "Your store application did not meet our requirements. You can reapply.",
    },
    suspended: {
      title: "Your store has been suspended",
      message: "Your store has been suspended. Please contact support for more information.",
    },
    under_review: {
      title: "Your application is under review",
      message: "Your store application is being reviewed. We will notify you once a decision is made.",
    },
  }

  const notification = notificationMap[status]
  if (notification && currentVendor?.user_id) {
    await supabase.from("notifications").insert({
      user_id: currentVendor.user_id,
      title: notification.title,
      message: notification.message,
      type: "system",
      link: "/vendor",
    })
  }

  return { success: true }
}

export async function updateVendorCommission(
  vendorId: string,
  commissionRate: number,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = vendorAdminUpdateSchema.safeParse({ commission_rate: commissionRate })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid commission rate" }
  }

  const supabase = await createServerClient()

  const { data: currentVendor } = await supabase
    .from("vendors")
    .select("commission_rate, store_name")
    .eq("id", vendorId)
    .single()

  const { error } = await supabase
    .from("vendors")
    .update({ commission_rate: commissionRate })
    .eq("id", vendorId)

  if (error) {
    return { success: false, error: "Failed to update commission rate" }
  }

  await createAuditLog({
    action: "commission.changed",
    entityType: "vendor",
    entityId: vendorId,
    oldValue: { commission_rate: currentVendor?.commission_rate },
    newValue: { commission_rate: commissionRate },
    metadata: { store_name: currentVendor?.store_name },
  })

  return { success: true }
}

export async function updateVendorDeliverySettings(formData: {
  delivery_areas: string[]
  delivery_charge: number
  estimated_delivery_time: string
  free_delivery_threshold: number
}): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createServerClient()

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!vendor) {
      return { success: false, error: "Vendor record not found" }
    }

    const { error } = await supabase
      .from("vendors")
      .update({
        delivery_areas: formData.delivery_areas,
        delivery_charge: formData.delivery_charge,
        estimated_delivery_time: formData.estimated_delivery_time || null,
        free_delivery_threshold: formData.free_delivery_threshold,
      })
      .eq("id", vendor.id)

    if (error) {
      return { success: false, error: "Failed to update delivery settings" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating delivery settings:", error)
    return { success: false, error: "Failed to update delivery settings" }
  }
}

export async function uploadSellerDocument(formData: {
  document_type: string
  file_url: string
  original_filename?: string
  file_size_bytes?: number
  mime_type?: string
}): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createServerClient()

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!vendor) {
      return { success: false, error: "Vendor record not found" }
    }

    const { data: existingDoc } = await supabase
      .from("seller_documents")
      .select("id")
      .eq("vendor_id", vendor.id)
      .eq("document_type", formData.document_type)
      .eq("status", "pending")
      .maybeSingle()

    if (existingDoc) {
      const { error } = await supabase
        .from("seller_documents")
        .update({
          file_url: formData.file_url,
          original_filename: formData.original_filename || null,
          file_size_bytes: formData.file_size_bytes || null,
          mime_type: formData.mime_type || null,
          status: "pending",
          rejection_reason: null,
        })
        .eq("id", existingDoc.id)

      if (error) {
        return { success: false, error: "Failed to update document" }
      }
    } else {
      const { error } = await supabase.from("seller_documents").insert({
        vendor_id: vendor.id,
        document_type: formData.document_type,
        file_url: formData.file_url,
        original_filename: formData.original_filename || null,
        file_size_bytes: formData.file_size_bytes || null,
        mime_type: formData.mime_type || null,
      })

      if (error) {
        return { success: false, error: "Failed to upload document" }
      }
    }

    await supabase
      .from("seller_verifications")
      .upsert({ vendor_id: vendor.id, overall_status: "partial" }, { onConflict: "vendor_id" })

    return { success: true }
  } catch (error) {
    console.error("Error uploading document:", error)
    return { success: false, error: "Failed to upload document" }
  }
}

export async function reviewSellerDocument(
  documentId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const supabase = await createServerClient()

    const { data: doc } = await supabase
      .from("seller_documents")
      .select("*, vendors ( id, store_name, user_id )")
      .eq("id", documentId)
      .single()

    if (!doc) {
      return { success: false, error: "Document not found" }
    }

    const updateData: Record<string, unknown> = {
      status,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    }
    if (status === "rejected" && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    const { error } = await supabase
      .from("seller_documents")
      .update(updateData)
      .eq("id", documentId)

    if (error) {
      return { success: false, error: "Failed to review document" }
    }

    await createAuditLog({
      action: status === "approved" ? "vendor.document_verified" : "vendor.document_rejected",
      entityType: "seller_document",
      entityId: documentId,
      oldValue: { status: "pending" },
      newValue: { status, rejection_reason: rejectionReason },
      metadata: {
        document_type: doc.document_type,
        vendor_id: doc.vendor_id,
        store_name: (doc.vendors as Record<string, unknown>)?.store_name,
      },
    })

    const vendorId = doc.vendor_id
    const { data: allDocs } = await supabase
      .from("seller_documents")
      .select("document_type, status")
      .eq("vendor_id", vendorId)

    if (allDocs) {
      const panVerified = allDocs.some((d) => d.document_type === "pan" && d.status === "approved")
      const vatVerified = allDocs.some((d) => d.document_type === "vat" && d.status === "approved")
      const bizVerified = allDocs.some(
        (d) => d.document_type === "business_registration" && d.status === "approved",
      )

      let overallStatus: "unverified" | "partial" | "verified" = "unverified"
      if (panVerified && bizVerified) {
        overallStatus = "verified"
      } else if (panVerified || vatVerified || bizVerified) {
        overallStatus = "partial"
      }

      await supabase
        .from("seller_verifications")
        .upsert(
          {
            vendor_id: vendorId,
            pan_verified: panVerified,
            vat_verified: vatVerified,
            business_verified: bizVerified,
            overall_status: overallStatus,
            verified_at: overallStatus === "verified" ? new Date().toISOString() : null,
          },
          { onConflict: "vendor_id" },
        )
    }

    const vendorUserId = (doc.vendors as Record<string, unknown>)?.user_id as string | undefined
    if (vendorUserId) {
      await supabase.from("notifications").insert({
        user_id: vendorUserId,
        title: status === "approved" ? "Document verified" : "Document rejected",
        message:
          status === "approved"
            ? `Your ${doc.document_type.toUpperCase()} document has been verified.`
            : `Your ${doc.document_type.toUpperCase()} document was rejected. ${rejectionReason || ""} Please re-upload.`,
        type: "system",
        link: "/vendor",
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Error reviewing document:", error)
    return { success: false, error: "Failed to review document" }
  }
}

export async function createSellerPromotion(formData: {
  vendor_id: string
  promotion_type: "trial" | "campaign" | "custom"
  commission_rate: number
  start_date: string
  end_date: string
  description?: string
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const supabase = await createServerClient()

    await supabase
      .from("seller_promotions")
      .update({ status: "cancelled" })
      .eq("vendor_id", formData.vendor_id)
      .eq("status", "active")

    const { error } = await supabase.from("seller_promotions").insert({
      vendor_id: formData.vendor_id,
      promotion_type: formData.promotion_type,
      commission_rate: formData.commission_rate,
      start_date: formData.start_date,
      end_date: formData.end_date,
      description: formData.description || null,
      created_by: admin.id,
    })

    if (error) {
      return { success: false, error: "Failed to create promotion" }
    }

    const { data: vendor } = await supabase
      .from("vendors")
      .select("store_name, user_id")
      .eq("id", formData.vendor_id)
      .single()

    if (vendor?.user_id) {
      await supabase.from("notifications").insert({
        user_id: vendor.user_id,
        title: "Promotion updated",
        message: `A new ${formData.promotion_type} promotion (${formData.commission_rate}% commission) has been applied to your store.`,
        type: "system",
        link: "/vendor",
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Error creating promotion:", error)
    return { success: false, error: "Failed to create promotion" }
  }
}
