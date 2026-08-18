import { ProductCard } from "@/components/ui/product-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import type { Product } from "@/lib/types"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"

export async function NewArrivals() {
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
      .order("created_at", { ascending: false })
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
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-3xl lg:text-4xl font-bold text-balance">New Arrivals</h2>
            </div>
            <p className="text-muted-foreground text-pretty">
              Fresh additions to our catalog
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex bg-transparent">
            <Link href="/products?sort=newest">
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
