import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductDetails } from "@/components/products/product-details"
import { RelatedProducts } from "@/components/products/related-products"
import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from("products")
    .select("name, description, price, image_url, brand")
    .eq("id", id)
    .single()

  if (!product) return { title: "Product Not Found" }

  return {
    title: `${product.name} - Tech Accessories Nepal`,
    description: product.description?.slice(0, 160) || `Buy ${product.name} at Tech Accessories Nepal. Price: Rs. ${product.price.toLocaleString()}`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) || `Buy ${product.name} at Tech Accessories Nepal`,
      images: product.image_url ? [{ url: product.image_url, alt: product.name }] : [],
      type: "website",
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      categories (
        id,
        name
      ),
      vendors (
        id,
        store_name,
        slug
      )
    `)
    .eq("id", id)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .single()

  if (error || !product) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles ( full_name ), review_replies ( id )")
    .eq("product_id", id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })

  const existingReview = user ? (reviews || []).find((r) => r.user_id === user.id) || null : null

  let canReview = false
  if (user && !existingReview) {
    const { data: purchasedItems } = await supabase
      .from("order_items")
      .select("id, orders!inner ( user_id, status ), suborders ( status )")
      .eq("product_id", id)
      .eq("orders.user_id", user.id)

    canReview = (purchasedItems || []).some((item: any) => {
      const suborderStatus = item.suborders?.status
      const orderStatus = item.orders?.status
      return suborderStatus === "delivered" || (!item.suborders && orderStatus === "delivered")
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 py-4">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5">
              <li>
                <a href="/" className="hover:text-primary transition-colors">Home</a>
              </li>
              <li>/</li>
              <li>
                <a href="/products" className="hover:text-primary transition-colors">Products</a>
              </li>
              {product.categories && (
                <>
                  <li>/</li>
                  <li>
                    <a href={`/categories/${product.categories.id}`} className="hover:text-primary transition-colors">
                      {product.categories.name}
                    </a>
                  </li>
                </>
              )}
              <li>/</li>
              <li className="text-foreground truncate max-w-[200px]">{product.name}</li>
            </ol>
          </nav>
        </div>

        <ProductDetails
          product={product}
          reviews={reviews || []}
          canReview={canReview}
          hasExistingReview={!!existingReview}
          isLoggedIn={!!user}
          currentUserId={user?.id}
        />
        <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />
      </main>
      <Footer />
    </div>
  )
}
