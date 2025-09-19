import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { CheckoutSummary } from "@/components/checkout/checkout-summary"
import { createClient } from "@/lib/supabase/server"

export default async function CheckoutPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/checkout")
  }

  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      *,
      products (
        id,
        name,
        price,
        image_url,
        stock_quantity,
        is_active
      )
    `)
    .eq("user_id", user.id)

  if (error || !cartItems || cartItems.length === 0) {
    redirect("/cart")
  }

  // Filter active products
  const activeCartItems = cartItems.filter((item) => item.products?.is_active)

  if (activeCartItems.length === 0) {
    redirect("/cart")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <p className="text-muted-foreground">Complete your order</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <CheckoutForm user={user} />
            <CheckoutSummary items={activeCartItems} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
