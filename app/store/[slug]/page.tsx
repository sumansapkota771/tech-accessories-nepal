import { notFound } from "next/navigation"
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductCard } from "@/components/ui/product-card"
import { Badge } from "@/components/ui/badge"
import { Store, Phone, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProductRatings, attachRatings } from "@/lib/get-product-ratings"
import type { Product } from "@/lib/types"

interface StorePageProps {
  params: Promise<{ slug: string }>
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
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })

  const ratings = await getProductRatings(supabase, (products || []).map((p) => p.id))
  const productsWithRatings = attachRatings(products || [], ratings)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative h-40 md:h-56 bg-muted overflow-hidden">
          {vendor.banner_url && (
            <Image src={vendor.banner_url} alt="" fill sizes="100vw" className="object-cover" />
          )}
        </div>

        <div className="container mx-auto px-4">
          <div className="flex items-end gap-4 -mt-10 mb-6">
            <div className="relative h-20 w-20 rounded-lg bg-background border shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              {vendor.logo_url ? (
                <Image src={vendor.logo_url} alt={vendor.store_name} fill sizes="80px" className="object-cover" />
              ) : (
                <Store className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{vendor.store_name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

          {vendor.description && <p className="text-muted-foreground mb-8 max-w-2xl">{vendor.description}</p>}

          <div className="pb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Products</h2>
              <Badge variant="secondary">{products?.length || 0} products</Badge>
            </div>

            {productsWithRatings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsWithRatings.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">This store hasn't listed any products yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
