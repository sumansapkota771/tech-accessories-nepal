import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductsGrid } from "@/components/products/products-grid"
import { ProductsFilters } from "@/components/products/products-filters"
import { ProductsSkeleton } from "@/components/products/products-skeleton"

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    sort?: string
    min_price?: string
    max_price?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">All Products</h1>
            <p className="text-muted-foreground">Discover our complete collection of premium tech accessories</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <ProductsFilters />
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              <Suspense fallback={<ProductsSkeleton />}>
                <ProductsGrid searchParams={params} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
