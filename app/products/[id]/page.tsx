import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductDetails } from "@/components/products/product-details"
import { RelatedProducts } from "@/components/products/related-products"
import { createClient } from "@/lib/supabase/server"

interface ProductPageProps {
  params: Promise<{ id: string }>
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
    .single()

  if (error || !product) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles ( full_name )")
    .eq("product_id", id)
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
        <ProductDetails
          product={product}
          reviews={reviews || []}
          canReview={canReview}
          hasExistingReview={!!existingReview}
          isLoggedIn={!!user}
        />
        <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />
      </main>
      <Footer />
    </div>
  )
}
