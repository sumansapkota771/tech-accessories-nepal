"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Review } from "@/lib/types"

interface ProductReviewsProps {
  productId: string
  reviews: (Review & { profiles: { full_name: string | null } | null })[]
  avgRating: number
  reviewCount: number
  canReview: boolean
  hasExistingReview: boolean
  isLoggedIn: boolean
}

export function ProductReviews({
  productId,
  reviews,
  avgRating,
  reviewCount,
  canReview,
  hasExistingReview,
  isLoggedIn,
}: ProductReviewsProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ title: "Pick a rating", description: "Select 1 to 5 stars before submitting.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")

      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      })
      if (error) throw error

      toast({ title: "Review posted", description: "Thanks for sharing your feedback!" })
      setRating(0)
      setComment("")
      router.refresh()
    } catch (error: any) {
      console.error("Error submitting review:", error)
      toast({
        title: "Couldn't post review",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{reviewCount > 0 ? avgRating.toFixed(1) : "—"}</div>
            <div>
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
              <p className="text-sm text-muted-foreground mt-1">
                Based on {reviewCount} review{reviewCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {canReview ? (
            <div className="space-y-3">
              <p className="font-medium text-sm">Write a review</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="What did you think of this product? (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Review"}
              </Button>
            </div>
          ) : hasExistingReview ? (
            <p className="text-sm text-muted-foreground">You've already reviewed this product — thanks!</p>
          ) : isLoggedIn ? (
            <p className="text-sm text-muted-foreground">
              Reviews are limited to customers who've received this product, so buyers can trust what they read.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in and purchase this product to leave a review.</p>
          )}
        </CardContent>
      </Card>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{review.profiles?.full_name || "Anonymous"}</p>
                    <div className="flex items-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground whitespace-pre-line">{review.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No reviews yet — be the first to leave one.</p>
      )}
    </div>
  )
}
