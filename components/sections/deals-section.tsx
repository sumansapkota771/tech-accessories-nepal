import { ProductCard } from "@/components/ui/product-card"
import { Badge } from "@/components/ui/badge"
import { Tag } from "lucide-react"
import type { Product } from "@/lib/types"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"

export async function DealsSection() {
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
      .not("original_price", "is", null)
      .order("created_at", { ascending: false })
      .limit(4)

    if (!error && data) {
      const discounted = data.filter((p) => p.original_price && p.original_price > p.price)
      const ratings = await getProductRatings(supabase, discounted.map((p) => p.id))
      products = attachRatings(discounted, ratings)
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
              <Tag className="h-5 w-5 text-destructive" />
              <h2 className="text-3xl lg:text-4xl font-bold text-balance">Deals & Offers</h2>
            </div>
            <p className="text-muted-foreground text-pretty">
              Great savings on premium tech accessories
            </p>
          </div>
          <Badge variant="destructive" className="text-sm px-3 py-1.5 hidden sm:flex">
            Save up to {Math.max(...products.map((p) => p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0))}%
          </Badge>
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
