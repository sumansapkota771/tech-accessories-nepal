import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/ui/product-card"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"
import type { Product } from "@/lib/types"

interface CategoryProductsProps {
  categoryId: string
}

export async function CategoryProducts({ categoryId }: CategoryProductsProps) {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching category products:", error)
    return <div>Error loading products</div>
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found in this category.</p>
      </div>
    )
  }

  const ratings = await getProductRatings(supabase, products.map((p) => p.id))
  const productsWithRatings = attachRatings(products, ratings)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {productsWithRatings.map((product: Product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
