import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CartContent } from "@/components/cart/cart-content"
import { CartSkeleton } from "@/components/cart/cart-skeleton"

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground">Review your items and proceed to checkout</p>
          </div>

          <Suspense fallback={<CartSkeleton />}>
            <CartContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
