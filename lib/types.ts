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
  status: "pending" | "approved" | "suspended" | "rejected"
  commission_rate: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  category_id: string | null
  vendor_id: string | null
  approval_status: "pending" | "approved" | "rejected"
  image_url: string | null
  images: string[] | null
  stock_quantity: number
  is_featured: boolean
  is_active: boolean
  specifications: Record<string, any> | null
  created_at: string
  updated_at: string
  categories?: Category
  vendors?: Vendor
  avg_rating?: number
  review_count?: number
}

export interface Category {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
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

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  role: "user" | "vendor" | "admin"
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  total_amount: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  shipping_address: Record<string, any>
  payment_method: string | null
  payment_status: "pending" | "paid" | "failed" | "refunded"
  created_at: string
  updated_at: string
  profiles?: Profile
  suborders?: Suborder[]
}

export interface Suborder {
  id: string
  order_id: string
  vendor_id: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  subtotal: number
  commission_rate: number
  commission_amount: number
  tracking_number: string | null
  created_at: string
  updated_at: string
  vendors?: Vendor
  order_items?: OrderItem[]
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

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}
