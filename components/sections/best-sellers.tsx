import { ProductCard } from "@/components/ui/product-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, TrendingUp } from "lucide-react"
import type { Product } from "@/lib/types"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"

export async function BestSellers() {
  let products: Product[] = []

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories ( id, name )
      `)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("review_count", { ascending: false })
      .limit(8)

    if (!error && data) {
      const ratings = await getProductRatings(supabase, data.map((p) => p.id))
      products = attachRatings(data, ratings)
    }
  } catch {
    // Supabase unavailable — render empty section
  }

  if (products.length === 0) return null

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-3xl lg:text-4xl font-bold text-balance">Best Sellers</h2>
            </div>
            <p className="text-muted-foreground text-pretty">
              Most popular products loved by our customers
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex bg-transparent">
            <Link href="/products?sort=popular">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
