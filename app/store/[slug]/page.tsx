import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductCard } from "@/components/ui/product-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Store, Phone, MapPin, Star, CheckCircle, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"
import type { Metadata } from "next"
import type { Product } from "@/lib/types"

interface StorePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: vendor } = await supabase
    .from("vendors")
    .select("store_name, description")
    .eq("slug", slug)
    .eq("status", "approved")
    .single()

  if (!vendor) return { title: "Store Not Found" }

  return {
    title: `${vendor.store_name} - Tech Accessories Nepal`,
    description: vendor.description?.slice(0, 160) || `Browse products from ${vendor.store_name} on Tech Accessories Nepal.`,
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single()

  if (vendorError || !vendor) {
    notFound()
  }

  const { data: products } = await supabase
    .from("products")
    .select(`*, categories ( id, name )`)
    .eq("vendor_id", vendor.id)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })

  const ratings = await getProductRatings(supabase, (products || []).map((p) => p.id))
  const productsWithRatings = attachRatings(products || [], ratings)

  // Calculate average seller rating from all products
  const allRatings = productsWithRatings.filter((p) => p.avg_rating && p.avg_rating > 0)
  const sellerAvgRating =
    allRatings.length > 0
      ? allRatings.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / allRatings.length
      : 0
  const sellerReviewCount = allRatings.reduce((sum, p) => sum + (p.review_count || 0), 0)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Banner */}
        <div className="relative h-40 md:h-56 bg-muted overflow-hidden">
          {vendor.banner_url && (
            <Image src={vendor.banner_url} alt="" fill sizes="100vw" className="object-cover" />
          )}
          {!vendor.banner_url && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
          )}
        </div>

        <div className="container mx-auto px-4">
          {/* Store Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 mb-6 relative z-10">
            <div className="relative h-20 w-20 rounded-lg bg-background border-2 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              {vendor.logo_url ? (
                <Image src={vendor.logo_url} alt={vendor.store_name} fill sizes="80px" className="object-cover" />
              ) : (
                <Store className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="pb-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{vendor.store_name}</h1>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified Seller
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                {sellerAvgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {sellerAvgRating.toFixed(1)} ({sellerReviewCount} reviews)
                  </span>
                )}
                {vendor.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {vendor.address}
                  </span>
                )}
                {vendor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {vendor.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {vendor.description && (
            <p className="text-muted-foreground mb-8 max-w-2xl">{vendor.description}</p>
          )}

          {/* Products Section */}
          <div className="pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </h2>
              <Badge variant="secondary">{products?.length || 0} products</Badge>
            </div>

            {productsWithRatings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsWithRatings.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border rounded-lg">
                <Store className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium mb-1">No products yet</p>
                <p className="text-sm text-muted-foreground">This store hasn&apos;t listed any products yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
