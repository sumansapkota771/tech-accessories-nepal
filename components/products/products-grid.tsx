import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/ui/product-card"
import { ProductsPagination } from "@/components/products/products-pagination"
import { ProductsSort } from "@/components/products/products-sort"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"
import type { Product } from "@/lib/types"

interface ProductsGridProps {
  searchParams: {
    search?: string
    category?: string
    sort?: string
    min_price?: string
    max_price?: string
    in_stock?: string
    featured?: string
    page?: string
  }
}

export async function ProductsGrid({ searchParams }: ProductsGridProps) {
  const supabase = await createClient()
  const page = Number.parseInt(searchParams.page || "1")
  const limit = 12
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from("products")
    .select(
      `
      *,
      categories (
        id,
        name
      )
    `,
      { count: "exact" },
    )
    .eq("is_active", true)
    .eq("is_deleted", false)

  // Multi-category filter
  if (searchParams.category) {
    const categories = searchParams.category.split(",").filter(Boolean)
    if (categories.length === 1) {
      query = query.eq("category_id", categories[0])
    } else if (categories.length > 1) {
      query = query.in("category_id", categories)
    }
  }

  // Search across name, brand, and SKU
  if (searchParams.search) {
    const term = searchParams.search.trim()
    query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`)
  }

  // Price range
  if (searchParams.min_price) {
    query = query.gte("price", Number.parseFloat(searchParams.min_price))
  }
  if (searchParams.max_price) {
    query = query.lte("price", Number.parseFloat(searchParams.max_price))
  }

  // In stock filter
  if (searchParams.in_stock === "true") {
    query = query.gt("stock_quantity", 0)
  }

  // Featured filter
  if (searchParams.featured === "true") {
    query = query.eq("is_featured", true)
  }

  // Sorting
  switch (searchParams.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true })
      break
    case "price_desc":
      query = query.order("price", { ascending: false })
      break
    case "name_asc":
      query = query.order("name", { ascending: true })
      break
    case "rating":
      query = query.order("avg_rating", { ascending: false })
      break
    case "popular":
      query = query.order("review_count", { ascending: false })
      break
    default:
      query = query.order("created_at", { ascending: false })
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data: products, error, count } = await query

  if (error) {
    console.error("Error fetching products:", error)
    return <div className="text-center py-12 text-muted-foreground">Error loading products. Please try again.</div>
  }

  const totalPages = Math.ceil((count || 0) / limit)
  const ratings = await getProductRatings(supabase, (products || []).map((p) => p.id))
  const productsWithRatings = attachRatings(products || [], ratings)

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {products?.length || 0} of {count || 0} products
        </p>
        <ProductsSort />
      </div>

      {/* Products Grid */}
      {productsWithRatings && productsWithRatings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsWithRatings.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-lg font-medium mb-2">No products found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <ProductsPagination currentPage={page} totalPages={totalPages} searchParams={searchParams} />
      )}
    </div>
  )
}
