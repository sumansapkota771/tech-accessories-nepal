import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AccountSidebar } from "@/components/account/account-sidebar"
import { ProductCard } from "@/components/ui/product-card"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"
import type { Product } from "@/lib/types"

export default async function WishlistPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/account/wishlist")
  }

  const { data: wishlistItems } = await supabase
    .from("wishlists")
    .select(`
      id,
      products (
        *,
        categories ( id, name ),
        vendors ( id, store_name, slug )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const products = ((wishlistItems || []).map((item: any) => item.products).filter(Boolean)) as Product[]
  const ratings = await getProductRatings(supabase, products.map((p) => p.id))
  const productsWithRatings = attachRatings(products, ratings)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">Products you've saved for later</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <AccountSidebar />
            </div>
            <div className="lg:col-span-3">
              {productsWithRatings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {productsWithRatings.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border rounded-lg">
                  <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-1">Your wishlist is empty</p>
                  <p className="text-sm text-muted-foreground">
                    Tap the heart icon on any product to save it here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
