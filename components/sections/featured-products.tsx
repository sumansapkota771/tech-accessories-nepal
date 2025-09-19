import { ProductCard } from "@/components/ui/product-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Product } from "@/lib/types"
import { mockProducts } from "@/lib/mock-data"

export async function FeaturedProducts() {
  // Try to fetch from Supabase, fallback to mock data
  let products: Product[] = []
  
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq("is_featured", true)
      .eq("is_active", true)
      .limit(8)

    if (error) {
      console.error("Error fetching featured products:", error)
      products = mockProducts.filter(product => product.is_featured).slice(0, 8)
    } else {
      products = data || []
    }
  } catch (error) {
    console.error("Supabase connection error:", error)
    products = mockProducts.filter(product => product.is_featured).slice(0, 8)
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl lg:text-4xl font-bold text-balance">Featured Products</h2>
            <p className="text-muted-foreground text-pretty">
              Discover our handpicked selection of premium tech accessories
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex bg-transparent">
            <Link href="/featured">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products?.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="flex justify-center mt-8 sm:hidden">
          <Button variant="outline" asChild>
            <Link href="/featured">
              View All Featured <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
