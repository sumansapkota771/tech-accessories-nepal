import { z } from "zod"

// ============================================================
// Auth schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const signUpSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

// ============================================================
// Product schemas
// ============================================================

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive("Price must be positive").max(999999.99),
  original_price: z.number().positive().max(999999.99).optional().nullable(),
  category_id: z.string().uuid("Invalid category").optional().nullable(),
  stock_quantity: z.number().int().min(0, "Stock cannot be negative").max(999999),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  specifications: z.record(z.string(), z.unknown()).optional().nullable(),
  images: z.array(z.string().url()).max(10).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  // Enhanced fields
  brand: z.string().max(100).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  condition: z.enum(["new", "refurbished", "used"]).default("new"),
  warranty: z.string().max(200).optional().nullable(),
  video_url: z.string().url().optional().nullable().or(z.literal("")),
  delivery_info: z.string().max(500).optional().nullable(),
  low_stock_threshold: z.number().int().min(0).max(9999).default(5),
  variants: z.array(z.object({
    name: z.string().min(1).max(50),
    options: z.array(z.string().min(1).max(100)).min(1),
    price_adjustment: z.number().optional(),
  })).max(5).optional().nullable(),
  product_status: z.enum(["draft", "pending", "unpublished"]).default("pending"),
})

export const productUpdateSchema = productSchema.partial()

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  slug: z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
})

export const categoryUpdateSchema = categorySchema.partial()

// ============================================================
// Vendor schemas
// ============================================================

export const vendorApplicationSchema = z.object({
  // Personal / business info
  full_name: z.string().min(2, "Full name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Phone number is required").max(20),
  location: z.string().min(2, "Location is required").max(100),

  // Store info
  store_name: z.string().min(2, "Store name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(2000).optional(),
  address: z.string().min(3, "Business address is required").max(200),
  logo_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),

  // Tax / business documents
  pan_number: z.string().min(5, "PAN number is required").max(20),
  pan_file_url: z.string().url("PAN document is required"),
  vat_number: z.string().max(20).optional().nullable(),
  vat_file_url: z.string().url().optional().nullable(),
  business_registration_number: z.string().max(50).optional().nullable(),

  // Delivery
  self_delivery_confirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm self-delivery to proceed" }),
  }),
  delivery_areas: z.array(z.string()).min(1, "At least one delivery area is required").optional(),
  delivery_charge: z.number().min(0).max(10000).optional(),
  estimated_delivery_time: z.string().max(100).optional().nullable(),
  free_delivery_threshold: z.number().min(0).max(100000).optional(),

  // Terms
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the marketplace terms" }),
  }),
})

export const vendorUpdateSchema = z.object({
  store_name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().min(7).max(20).optional(),
  address: z.string().min(3).max(200).optional(),
  location: z.string().min(2).max(100).optional(),
  logo_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  // Delivery settings
  delivery_areas: z.array(z.string()).optional(),
  delivery_charge: z.number().min(0).max(10000).optional(),
  estimated_delivery_time: z.string().max(100).optional().nullable(),
  free_delivery_threshold: z.number().min(0).max(100000).optional(),
})

export const vendorAdminUpdateSchema = z.object({
  status: z.enum(["pending", "under_review", "approved", "suspended", "rejected", "blocked", "expired"]).optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  rejection_reason: z.string().max(1000).optional(),
})

// ============================================================
// Order / Checkout schemas
// ============================================================

export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z.string().min(7, "Phone number is required").max(20),
  address: z.string().min(5, "Address is required").max(300),
  city: z.string().min(2, "City is required").max(100),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
})

export const placeOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["cod"], {
    errorMap: () => ({ message: "This payment method is not available yet" }),
  }),
  deliveryMethod: z.enum(["standard", "express", "self_pickup"]).default("standard"),
  notes: z.string().max(500).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
})

// ============================================================
// Review schemas
// ============================================================

export const reviewSchema = z.object({
  product_id: z.string().uuid("Invalid product"),
  rating: z.number().int().min(1, "Rating is required").max(5),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
})

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
})

export const reviewReportSchema = z.object({
  review_id: z.string().uuid("Invalid review"),
  reason: z.enum(["spam", "inappropriate", "fake", "offensive", "fraud", "irrelevant", "personal_info", "other"]),
  description: z.string().max(1000).optional(),
})

// ============================================================
// Review reply schema
// ============================================================

export const reviewReplySchema = z.object({
  review_id: z.string().uuid("Invalid review"),
  content: z.string().min(1, "Reply cannot be empty").max(2000),
})

// ============================================================
// Seller document schema
// ============================================================

export const sellerDocumentSchema = z.object({
  document_type: z.enum(["pan", "vat", "business_registration", "other"]),
  file_url: z.string().url("File URL is required"),
  original_filename: z.string().max(255).optional(),
  file_size_bytes: z.number().int().positive().max(5 * 1024 * 1024).optional(),
  mime_type: z.string().optional(),
})

// ============================================================
// Category request schema
// ============================================================

export const categoryRequestSchema = z.object({
  requested_name: z.string().min(2, "Category name is required").max(100),
  description: z.string().max(500).optional(),
  parent_category_id: z.string().uuid().optional().nullable(),
})

// ============================================================
// QC review schema
// ============================================================

export const qcReviewSchema = z.object({
  product_id: z.string().uuid("Invalid product"),
  action: z.enum(["approve", "request_changes", "reject"]),
  notes: z.string().max(2000).optional(),
})

// ============================================================
// Commission rule schema
// ============================================================

export const commissionRuleSchema = z.object({
  name: z.string().min(1).max(100),
  rule_type: z.enum(["percentage", "fixed", "tiered"]),
  rate: z.number().min(0).max(100),
  min_amount: z.number().positive().optional().nullable(),
  max_amount: z.number().positive().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

// ============================================================
// Seller promotion schema
// ============================================================

export const sellerPromotionSchema = z.object({
  vendor_id: z.string().uuid("Invalid vendor"),
  promotion_type: z.enum(["trial", "campaign", "custom"]).default("trial"),
  commission_rate: z.number().min(0).max(100),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  description: z.string().max(500).optional(),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
})

// ============================================================
// Payout schema
// ============================================================

export const payoutRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999999.99),
  payment_method: z.string().min(1, "Payment method is required").max(50),
  notes: z.string().max(500).optional(),
})

export const payoutApprovalSchema = z.object({
  payout_id: z.string().uuid("Invalid payout"),
  status: z.enum(["approved", "completed", "failed", "cancelled"]),
  notes: z.string().max(500).optional(),
})

// ============================================================
// Financial query schema
// ============================================================

export const financialQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  status: z.string().optional(),
})

// ============================================================
// Admin bootstrap schema
// ============================================================

export const adminBootstrapSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

// ============================================================
// Pagination schema
// ============================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(12),
})

// ============================================================
// Type exports
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type ProductInput = z.infer<typeof productSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>
export type ReviewReportInput = z.infer<typeof reviewReportSchema>
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>
export type SellerDocumentInput = z.infer<typeof sellerDocumentSchema>
export type CategoryRequestInput = z.infer<typeof categoryRequestSchema>
export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>
export type SellerPromotionInput = z.infer<typeof sellerPromotionSchema>
export type PayoutRequestInput = z.infer<typeof payoutRequestSchema>
export type PayoutApprovalInput = z.infer<typeof payoutApprovalSchema>
export type FinancialQueryInput = z.infer<typeof financialQuerySchema>
export type QCReviewInput = z.infer<typeof qcReviewSchema>
