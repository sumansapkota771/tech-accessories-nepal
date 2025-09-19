import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CartItems } from "@/components/cart/cart-items"
import { CartSummary } from "@/components/cart/cart-summary"
import { EmptyCart } from "@/components/cart/empty-cart"
import type { CartItem } from "@/lib/types"

export async function CartContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/cart")
  }

  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      *,
      products (
        id,
        name,
        price,
        original_price,
        image_url,
        stock_quantity,
        is_active
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching cart items:", error)
    return <div>Error loading cart items</div>
  }

  if (!cartItems || cartItems.length === 0) {
    return <EmptyCart />
  }

  // Filter out items with inactive products
  const activeCartItems = cartItems.filter((item: CartItem) => item.products?.is_active)

  if (activeCartItems.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <CartItems items={activeCartItems} />
      </div>
      <div className="lg:col-span-1">
        <CartSummary items={activeCartItems} />
      </div>
    </div>
  )
}
