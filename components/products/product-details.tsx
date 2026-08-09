"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ShoppingCart, Star, Truck, Shield, RotateCcw, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ProductReviews } from "@/components/products/product-reviews"
import { WishlistButton } from "@/components/ui/wishlist-button"
import type { Product, Review } from "@/lib/types"

interface ProductDetailsProps {
  product: Product
  reviews: (Review & { profiles: { full_name: string | null } | null })[]
  canReview: boolean
  hasExistingReview: boolean
  isLoggedIn: boolean
}

const DESCRIPTION_TRUNCATE_LENGTH = 320

export function ProductDetails({ product, reviews, canReview, hasExistingReview, isLoggedIn }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image_url || "/placeholder.svg?height=600&width=600"]

  const discountPercentage = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  const { avgRating, reviewCount } = useMemo(() => {
    if (reviews.length === 0) return { avgRating: 0, reviewCount: 0 }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return { avgRating: sum / reviews.length, reviewCount: reviews.length }
  }, [reviews])

  const description = product.description || ""
  const isLongDescription = description.length > DESCRIPTION_TRUNCATE_LENGTH
  const displayedDescription =
    isLongDescription && !descriptionExpanded ? `${description.slice(0, DESCRIPTION_TRUNCATE_LENGTH).trim()}…` : description

  const addToCart = async () => {
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to add items to cart.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("cart_items").upsert(
        {
          user_id: user.id,
          product_id: product.id,
          quantity: quantity,
        },
        {
          onConflict: "user_id,product_id",
        },
      )

      if (error) throw error

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image
              src={images[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {product.categories && <p className="text-sm text-muted-foreground mb-2">{product.categories.name}</p>}
            <h1 className="text-3xl font-bold text-balance">{product.name}</h1>

            <div className="flex items-center gap-2 mt-2">
              {reviewCount > 0 ? (
                <>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({avgRating.toFixed(1)}) • {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No reviews yet</span>
              )}
            </div>

            {product.vendors && (
              <Link
                href={`/store/${product.vendors.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
              >
                <Store className="h-3.5 w-3.5" />
                Sold by <span className="font-medium">{product.vendors.store_name}</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-primary">Rs. {product.price.toLocaleString()}</span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    Rs. {product.original_price.toLocaleString()}
                  </span>
                  <Badge variant="destructive">-{discountPercentage}% OFF</Badge>
                </>
              )}
            </div>
          </div>

          {description && (
            <div>
              <p className="text-muted-foreground whitespace-pre-line">{displayedDescription}</p>
              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((v) => !v)}
                  className="text-sm text-primary hover:underline mt-1 font-medium"
                >
                  {descriptionExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity:
              </label>
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value))}
                className="border rounded px-3 py-1"
              >
                {[...Array(Math.min(10, product.stock_quantity))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-muted-foreground">{product.stock_quantity} in stock</span>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={addToCart}
              disabled={isLoading || product.stock_quantity === 0}
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
            <WishlistButton productId={product.id} variant="outline" size="lg" />
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-primary" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span>Warranty</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-16">
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews {reviewCount > 0 ? `(${reviewCount})` : ""}</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
          </TabsList>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {product.specifications ? (
                  <div className="space-y-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b last:border-b-0">
                        <span className="font-medium capitalize">{key.replace("_", " ")}</span>
                        <span className="text-muted-foreground">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No specifications available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ProductReviews
              productId={product.id}
              reviews={reviews}
              avgRating={avgRating}
              reviewCount={reviewCount}
              canReview={canReview}
              hasExistingReview={hasExistingReview}
              isLoggedIn={isLoggedIn}
            />
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Shipping Information</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Same day delivery in Kathmandu Valley</li>
                    <li>• 2-3 days delivery outside Kathmandu</li>
                    <li>• Free shipping on orders above Rs. 5,000</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Returns & Exchanges</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 7-day return policy</li>
                    <li>• Items must be in original condition</li>
                    <li>• Free returns for defective products</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
