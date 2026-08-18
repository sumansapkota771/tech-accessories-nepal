"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface ReviewWithProduct {
  id: string
  rating: number
  title: string | null
  comment: string | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any
}

function getProduct(review: ReviewWithProduct) {
  if (!review.products) return null
  return Array.isArray(review.products) ? review.products[0] : review.products
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-primary text-primary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  )
}

export default function AccountReviewsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/auth/login?redirect=/account/reviews"
        return
      }
      setUser(user)

      const { data } = await supabase
        .from("reviews")
        .select("id, rating, title, comment, created_at, products(id, name, image_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setReviews(
        (data || []).map((r: any) => ({
          ...r,
          products: Array.isArray(r.products) ? r.products[0] : r.products,
        }))
      )
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Reviews</h2>
        <p className="text-muted-foreground">Reviews you&apos;ve written for products</p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You haven&apos;t written any reviews yet.</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const product = getProduct(review)
            return (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {product?.image_url && (
                    <Link href={`/products/${product.id}`} className="shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${product?.id}`}
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {product?.name}
                        </Link>
                        <StarRating rating={review.rating} />
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {review.rating}/5
                      </Badge>
                    </div>
                    {review.title && (
                      <p className="mt-2 font-medium text-sm">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
