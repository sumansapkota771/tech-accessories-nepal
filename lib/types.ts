export type UserRole = "user" | "vendor" | "admin"
export type VendorStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended" | "blocked" | "expired"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type OrderStatus = "pending" | "confirmed" | "processing" | "partially_shipped" | "shipped" | "partially_delivered" | "delivered" | "completed" | "cancelled"
export type SuborderStatus = "pending" | "accepted" | "processing" | "ready_for_delivery" | "out_for_delivery" | "delivered" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"
export type DeliveryMethod = "standard" | "express" | "self_pickup"
export type DocumentType = "pan" | "vat" | "business_registration" | "other"
export type DocumentStatus = "pending" | "approved" | "rejected"
export type VerificationStatus = "unverified" | "partial" | "verified"
export type PromotionType = "trial" | "campaign" | "custom"
export type PromotionStatus = "active" | "expired" | "cancelled"
export type FeeType = "commission" | "listing" | "shipping" | "promotion" | "other"
export type CommissionRuleType = "percentage" | "fixed" | "tiered"
export type PayoutStatus = "pending" | "approved" | "processing" | "completed" | "failed" | "cancelled"
export type FinancialTransactionType = "sale" | "commission" | "refund" | "payout" | "adjustment" | "reversal"
export type CategoryRequestStatus = "pending" | "approved" | "rejected"
export type ProductStatus = "draft" | "pending" | "qc_changes_requested" | "qc_rejected" | "approved" | "published" | "unpublished" | "suspended" | "deleted"
export type ProductCondition = "new" | "refurbished" | "used"
export type QCStatus = "pending" | "in_review" | "approved" | "rejected"
export type ReviewReportReason = "spam" | "inappropriate" | "fake" | "offensive" | "fraud" | "irrelevant" | "personal_info" | "other"
export type ReviewReportStatus = "pending" | "reviewed" | "resolved" | "dismissed"
export type ReviewSortOption = "newest" | "oldest" | "highest" | "lowest" | "most_helpful"
export type NotificationType = "info" | "order" | "product" | "review" | "payment" | "system"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  user_id: string
  store_name: string
  slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  phone: string | null
  address: string | null
  status: VendorStatus
  commission_rate: number
  is_deleted: boolean
  // Onboarding fields
  full_name: string | null
  location: string | null
  pan_number: string | null
  pan_file_url: string | null
  vat_number: string | null
  vat_file_url: string | null
  business_registration_number: string | null
  self_delivery_confirmed: boolean
  self_delivery_confirmed_at: string | null
  delivery_areas: string[] | null
  delivery_charge: number | null
  estimated_delivery_time: string | null
  free_delivery_threshold: number | null
  rejection_reason: string | null
  rejected_at: string | null
  under_review_at: string | null
  // Reputation fields (auto-calculated from real data)
  avg_rating: number
  review_count: number
  fulfillment_rate: number
  cancellation_rate: number
  reputation_score: number
  last_reputation_update: string | null
  created_at: string
  updated_at: string
}

export interface SellerDocument {
  id: string
  vendor_id: string
  document_type: DocumentType
  file_url: string
  original_filename: string | null
  file_size_bytes: number | null
  mime_type: string | null
  status: DocumentStatus
  rejection_reason: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface SellerVerification {
  id: string
  vendor_id: string
  pan_verified: boolean
  vat_verified: boolean
  business_verified: boolean
  overall_status: VerificationStatus
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface SellerPromotion {
  id: string
  vendor_id: string
  promotion_type: PromotionType
  commission_rate: number
  start_date: string
  end_date: string
  status: PromotionStatus
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SellerFee {
  id: string
  vendor_id: string
  fee_type: FeeType
  amount: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommissionRule {
  id: string
  name: string
  rule_type: CommissionRuleType
  rate: number
  min_amount: number | null
  max_amount: number | null
  category_id: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SellerWallet {
  id: string
  vendor_id: string
  balance: number
  total_earned: number
  total_withdrawn: number
  total_commission_paid: number
  created_at: string
  updated_at: string
}

export interface Payout {
  id: string
  vendor_id: string
  amount: number
  status: PayoutStatus
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface FinancialLedgerEntry {
  id: string
  vendor_id: string
  order_id: string | null
  suborder_id: string | null
  type: FinancialTransactionType
  amount: number
  balance_after: number
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string | null
  description: string | null
  image_url: string | null
  is_active: boolean
  parent_id: string | null
  sort_order: number
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  children?: Category[]
}

export interface CategoryRequest {
  id: string
  vendor_id: string
  requested_name: string
  description: string | null
  parent_category_id: string | null
  status: CategoryRequestStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_category_id: string | null
  created_at: string
  updated_at: string
  vendors?: Vendor
}

export interface ProductVariant {
  name: string
  options: string[]
  price_adjustment?: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  category_id: string | null
  vendor_id: string | null
  approval_status: ApprovalStatus
  image_url: string | null
  images: string[] | null
  stock_quantity: number
  is_featured: boolean
  is_active: boolean
  is_deleted: boolean
  specifications: Record<string, unknown> | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  // Enhanced fields
  brand: string | null
  sku: string | null
  condition: ProductCondition
  warranty: string | null
  video_url: string | null
  delivery_info: string | null
  low_stock_threshold: number
  variants: ProductVariant[] | null
  product_status: ProductStatus
  qc_notes: string | null
  // Relations
  categories?: Category
  vendors?: Vendor
  avg_rating?: number
  review_count?: number
}

export interface ProductQualityCheck {
  id: string
  product_id: string
  submitted_by: string
  status: QCStatus
  rejection_reason: string | null
  reviewer_id: string | null
  reviewer_notes: string | null
  reviewed_at: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
  products?: Product
}

export interface Order {
  id: string
  user_id: string
  total_amount: number
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  status: OrderStatus
  shipping_address: Record<string, unknown>
  payment_method: string | null
  payment_status: PaymentStatus
  delivery_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  suborders?: Suborder[]
  order_events?: OrderEvent[]
}

export interface Suborder {
  id: string
  order_id: string
  vendor_id: string
  status: SuborderStatus
  subtotal: number
  commission_rate: number
  commission_amount: number
  delivery_charge: number
  estimated_delivery_time: string | null
  delivery_area: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  vendors?: Vendor
  order_items?: OrderItem[]
  order_events?: OrderEvent[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  vendor_id: string | null
  suborder_id: string | null
  quantity: number
  price: number
  created_at: string
  products?: Product
}

export interface OrderEvent {
  id: string
  order_id: string
  suborder_id: string | null
  event_type: string
  old_status: string | null
  new_status: string | null
  actor_id: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  images: string[] | null
  is_flagged: boolean
  is_hidden: boolean
  edited_at: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  review_replies?: ReviewReply[]
  products?: Product
}

export interface ReviewReply {
  id: string
  review_id: string
  vendor_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface ReviewReport {
  id: string
  review_id: string
  reported_by: string
  reason: ReviewReportReason
  description: string | null
  status: ReviewReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface ReviewStats {
  avg_rating: number
  review_count: number
  rating_distribution: Record<number, number>
}

export interface AdminReviewItem {
  id: string
  product_id: string
  product_name: string
  user_id: string
  user_name: string | null
  user_email: string | null
  vendor_id: string
  vendor_name: string
  rating: number
  comment: string | null
  images: string[] | null
  is_flagged: boolean
  is_hidden: boolean
  has_reply: boolean
  report_count: number
  created_at: string
}
