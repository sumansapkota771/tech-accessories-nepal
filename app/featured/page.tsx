import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { FeaturedProductsGrid } from "@/components/featured/featured-products-grid"

export default function FeaturedPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Featured Products</h1>
            <p className="text-muted-foreground">Discover our handpicked selection of premium tech accessories</p>
          </div>

          <FeaturedProductsGrid />
        </div>
      </main>
      <Footer />
    </div>
  )
}
