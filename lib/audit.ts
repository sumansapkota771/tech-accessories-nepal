import { createServerClient } from "@/lib/supabase/server"

export type AuditAction =
  | "vendor.approved"
  | "vendor.rejected"
  | "vendor.suspended"
  | "vendor.document_verified"
  | "vendor.document_rejected"
  | "product.approved"
  | "product.rejected"
  | "product.deleted"
  | "product.created"
  | "product.updated"
  | "product.submitted_for_qc"
  | "product.qc.approved"
  | "product.qc.rejected"
  | "product.qc.changes_requested"
  | "product.status_changed"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "category.request_approved"
  | "category.request_rejected"
  | "review.moderated"
  | "review.report_resolved"
  | "order.status_changed"
  | "order.cancelled"
  | "payout.approved"
  | "payout.rejected"
  | "payout.processing"
  | "commission.changed"
  | "wallet.credited"
  | "wallet.debited"
  | "financial.reversal"
  | "admin.bootstrap"
  | "admin.role_changed"

export type AuditEntityType =
  | "vendor"
  | "product"
  | "category"
  | "review"
  | "order"
  | "suborder"
  | "payout"
  | "commission_rule"
  | "seller_document"
  | "category_request"
  | "profile"
  | "promotion"
  | "wallet"
  | "financial_ledger"

interface AuditLogParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Create an audit log entry via database function.
 * Call this from server actions or API routes.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createServerClient()

    await supabase.rpc("create_audit_log", {
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId ?? null,
      p_old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      p_new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
  } catch (error) {
    // Audit logging should never block the operation
    console.error("Failed to create audit log:", error)
  }
}
