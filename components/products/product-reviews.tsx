"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, CheckCircle, Pencil, Trash2, Flag, X, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { createReview, editReview, deleteReview, reportReview } from "@/lib/actions/reviews"
import type { Review, ReviewReply } from "@/lib/types"
import { format } from "date-fns"

interface ProductReviewsProps {
  productId: string
  reviews: (Review & {
    profiles: { full_name: string | null } | null
    review_replies?: ReviewReply[]
  })[]
  avgRating: number
  reviewCount: number
  canReview: boolean
  hasExistingReview: boolean
  isLoggedIn: boolean
  currentUserId?: string
}

type SortOption = "newest" | "oldest" | "highest" | "lowest"

export function ProductReviews({
  productId,
  reviews,
  avgRating,
  reviewCount,
  canReview,
  hasExistingReview,
  isLoggedIn,
  currentUserId,
}: ProductReviewsProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(0)
  const [editComment, setEditComment] = useState("")
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<string>("")
  const [reportDescription, setReportDescription] = useState("")
  const [expandedImages, setExpandedImages] = useState<string | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  // Rating distribution
  const distribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const review of reviews) {
      dist[review.rating] = (dist[review.rating] || 0) + 1
    }
    return dist
  }, [reviews])

  // Sorted reviews
  const sortedReviews = useMemo(() => {
    const sorted = [...reviews]
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case "highest":
        return sorted.sort((a, b) => b.rating - a.rating)
      case "lowest":
        return sorted.sort((a, b) => a.rating - b.rating)
      default:
        return sorted
    }
  }, [reviews, sortBy])

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ title: "Pick a rating", description: "Select 1 to 5 stars before submitting.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createReview(productId, rating, comment || undefined)
      if (!result.success) {
        throw new Error(result.error)
      }

      toast({ title: "Review posted", description: "Thanks for sharing your feedback!" })
      setRating(0)
      setComment("")
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again."
      toast({
        title: "Couldn't post review",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (reviewId: string) => {
    if (editRating < 1) {
      toast({ title: "Pick a rating", description: "Select 1 to 5 stars.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await editReview(reviewId, {
        rating: editRating,
        comment: editComment || undefined,
      })
      if (!result.success) throw new Error(result.error)

      toast({ title: "Review updated" })
      setEditingReviewId(null)
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update review."
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return

    try {
      const result = await deleteReview(reviewId)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Review deleted" })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete review."
      toast({ title: "Error", description: message, variant: "destructive" })
    }
  }

  const handleReport = async (reviewId: string) => {
    if (!reportReason) {
      toast({ title: "Select a reason", description: "Please choose a reason for reporting.", variant: "destructive" })
      return
    }

    try {
      const result = await reportReview(reviewId, reportReason as any, reportDescription || undefined)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Report submitted", description: "We will review your report." })
      setReportingReviewId(null)
      setReportReason("")
      setReportDescription("")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit report."
      toast({ title: "Error", description: message, variant: "destructive" })
    }
  }

  const startEditing = (review: Review) => {
    setEditingReviewId(review.id)
    setEditRating(review.rating)
    setEditComment(review.comment || "")
  }

  function renderStars(rating: number, size: "sm" | "md" = "sm") {
    const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4"
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClass} ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Overall Rating */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{reviewCount > 0 ? avgRating.toFixed(1) : "—"}</div>
              <div>
                <div className="flex items-center gap-0.5">{renderStars(Math.round(avgRating), "md")}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            {reviewCount > 0 && (
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star] || 0
                  const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-right text-muted-foreground">{star}</span>
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Write a Review Form */}
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
                {rating > 0 && <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>}
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
            <p className="text-sm text-muted-foreground">You&apos;ve already reviewed this product — thanks!</p>
          ) : isLoggedIn ? (
            <p className="text-sm text-muted-foreground">
              Reviews are limited to customers who&apos;ve received this product, so buyers can trust what they read.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in and purchase this product to leave a review.</p>
          )}
        </CardContent>
      </Card>

      {/* Sort Controls */}
      {reviews.length > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Reviews</p>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rated</SelectItem>
              <SelectItem value="lowest">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Review List */}
      {sortedReviews.length > 0 ? (
        <div className="space-y-4">
          {sortedReviews.map((review) => {
            const isOwner = currentUserId === review.user_id
            const isEditing = editingReviewId === review.id
            const isReporting = reportingReviewId === review.id

            return (
              <Card key={review.id}>
                <CardContent className="p-6">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{review.profiles?.full_name || "Anonymous"}</p>
                        {review.images && review.images.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {review.images.length} photo{review.images.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {review.edited_at && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" aria-label="Verified purchase" />
                        <span className="text-xs text-green-600">Verified purchase</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>

                  {/* Review Content (editable) */}
                  {isEditing ? (
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                star <= editRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(review.id)} disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingReviewId(null)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {review.comment && (
                        <p className="text-sm text-foreground/80 whitespace-pre-line mt-2">{review.comment}</p>
                      )}

                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {review.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setExpandedImages(expandedImages === img ? null : img)}
                              className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Expanded Image Modal */}
                      {expandedImages && (
                        <div
                          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                          onClick={() => setExpandedImages(null)}
                        >
                          <div className="relative max-w-2xl max-h-[80vh]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={expandedImages}
                              alt="Review photo"
                              className="max-w-full max-h-[80vh] rounded-lg"
                            />
                            <button
                              onClick={() => setExpandedImages(null)}
                              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Seller Reply */}
                  {review.review_replies && review.review_replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-2 border-l-2 border-primary/20 pl-4">
                      {review.review_replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">Seller reply</span>
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(reply.created_at), "MMM dd, yyyy")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 mt-3">
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => startEditing(review)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </>
                      )}
                      {isLoggedIn && !isOwner && !isReporting && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => setReportingReviewId(review.id)}
                        >
                          <Flag className="h-3 w-3" />
                          Report
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Report Form */}
                  {isReporting && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                      <p className="text-xs font-medium">Report this review</p>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                      >
                        <option value="">Select a reason...</option>
                        <option value="spam">Spam</option>
                        <option value="fake">Fake review</option>
                        <option value="offensive">Offensive content</option>
                        <option value="fraud">Fraud</option>
                        <option value="irrelevant">Irrelevant</option>
                        <option value="personal_info">Personal information</option>
                        <option value="other">Other</option>
                      </select>
                      <Textarea
                        placeholder="Additional details (optional)"
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleReport(review.id)}>
                          Submit Report
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setReportingReviewId(null)
                            setReportReason("")
                            setReportDescription("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No reviews yet — be the first to leave one.</p>
      )}
    </div>
  )
}
