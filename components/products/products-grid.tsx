import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/ui/product-card"
import { ProductsPagination } from "@/components/products/products-pagination"
import { ProductsSort } from "@/components/products/products-sort"
import type { Product } from "@/lib/types"

interface ProductsGridProps {
  searchParams: {
    search?: string
    category?: string
    sort?: string
    min_price?: string
    max_price?: string
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

  // Apply filters
  if (searchParams.search) {
    query = query.ilike("name", `%${searchParams.search}%`)
  }

  if (searchParams.category) {
    query = query.eq("category_id", searchParams.category)
  }

  if (searchParams.min_price) {
    query = query.gte("price", Number.parseFloat(searchParams.min_price))
  }

  if (searchParams.max_price) {
    query = query.lte("price", Number.parseFloat(searchParams.max_price))
  }

  // Apply sorting
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
    case "newest":
      query = query.order("created_at", { ascending: false })
      break
    default:
      query = query.order("created_at", { ascending: false })
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data: products, error, count } = await query

  if (error) {
    console.error("Error fetching products:", error)
    return <div>Error loading products</div>
  }

  const totalPages = Math.ceil((count || 0) / limit)

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
      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && <ProductsPagination currentPage={page} totalPages={totalPages} searchParams={searchParams} />}
    </div>
  )
}
