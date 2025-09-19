export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  category_id: string | null
  image_url: string | null
  images: string[] | null
  stock_quantity: number
  is_featured: boolean
  is_active: boolean
  specifications: Record<string, any> | null
  created_at: string
  updated_at: string
  categories?: Category
}

export interface Category {
  id: string
  name: string
  description: string | null
  image_url: string | null
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
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  products?: Product
}
