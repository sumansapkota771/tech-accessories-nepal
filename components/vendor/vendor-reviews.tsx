"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { replyToReview } from "@/lib/actions/reviews"
import { useToast } from "@/hooks/use-toast"
import type { ReviewReply } from "@/lib/types"
import { Star, MessageSquare, Loader2, CheckCircle } from "lucide-react"
import { format } from "date-fns"

interface VendorReviewsProps {
  vendorId: string
}

interface ReviewWithReplies {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  images: string[] | null
  is_flagged: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
  products: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
  review_replies: ReviewReply[]
}

export function VendorReviews({ vendorId }: VendorReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [filterRating, setFilterRating] = useState("all")
  const [filterHasReply, setFilterHasReply] = useState("all")
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchReviews()
  }, [])

  async function fetchReviews() {
    try {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("vendor_id", vendorId)

      if (productsError) throw productsError
      if (!products || products.length === 0) {
        setLoading(false)
        return
      }

      const productIds = products.map((p) => p.id)

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_user_id_fkey(full_name, email), review_replies(*)")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })

      if (reviewsError) throw reviewsError

      const productMap = new Map(products.map((p) => [p.id, p.name]))

      const enriched: ReviewWithReplies[] = (reviewsData || []).map((r) => {
        const { products: _origProducts, ...rest } = r as Record<string, unknown> & { products?: unknown; review_replies?: ReviewReply[]; profiles?: { full_name: string | null; email: string } | null }
        return {
          ...rest,
          products: { name: productMap.get(r.product_id) || "Product" },
          profiles: r.profiles || null,
          review_replies: r.review_replies || [],
        } as ReviewWithReplies
      })

      setReviews(enriched)
    } catch (err) {
      console.error("Error fetching reviews:", err)
      toast({ title: "Error", description: "Failed to load reviews.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, replyRate: 0 }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let replied = 0
    for (const r of reviews) {
      dist[r.rating as keyof typeof dist] = (dist[r.rating as keyof typeof dist] || 0) + 1
      if (r.review_replies.length > 0) replied++
    }
    return {
      avg: sum / reviews.length,
      count: reviews.length,
      distribution: dist,
      replyRate: reviews.length > 0 ? (replied / reviews.length) * 100 : 0,
    }
  }, [reviews])

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (filterRating !== "all" && r.rating !== parseInt(filterRating)) return false
      if (filterHasReply === "replied" && r.review_replies.length === 0) return false
      if (filterHasReply === "no_reply" && r.review_replies.length > 0) return false
      return true
    })
  }, [reviews, filterRating, filterHasReply])

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      const result = await replyToReview(reviewId, replyText.trim())
      if (!result.success) {
        throw new Error(result.error)
      }
      toast({ title: "Reply posted", description: "Your reply has been published." })
      setReplyingTo(null)
      setReplyText("")
      await fetchReviews()
    } catch (err) {
      console.error("Error replying:", err)
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to post reply.", variant: "destructive" })
    } finally {
      setSubmittingReply(false)
    }
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
        }`}
      />
    ))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>Customer reviews on your products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Reviews
        </CardTitle>
        <CardDescription>Customer reviews on your products</CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reviews will appear here once customers start rating your products.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{stats.avg.toFixed(1)}</div>
                <div className="flex items-center justify-center gap-0.5 mt-1">{renderStars(Math.round(stats.avg))}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.count} review{stats.count !== 1 ? "s" : ""}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Rating Distribution</p>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star as keyof typeof stats.distribution] || 0
                  const pct = stats.count > 0 ? (count / stats.count) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2">{star}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-5 text-right text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>

              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{stats.replyRate.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Reply Rate</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  of reviews you&apos;ve replied to
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ratings</SelectItem>
                  <SelectItem value="5">5 stars</SelectItem>
                  <SelectItem value="4">4 stars</SelectItem>
                  <SelectItem value="3">3 stars</SelectItem>
                  <SelectItem value="2">2 stars</SelectItem>
                  <SelectItem value="1">1 star</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterHasReply} onValueChange={setFilterHasReply}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Reply status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reviews</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="no_reply">Awaiting reply</SelectItem>
                </SelectContent>
              </Select>
              {(filterRating !== "all" || filterHasReply !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setFilterRating("all"); setFilterHasReply("all") }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No reviews match the selected filters.</p>
              ) : (
                filteredReviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                          {(review.profiles?.full_name || review.profiles?.email || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {review.profiles?.full_name || review.profiles?.email || "Anonymous"}
                            </p>
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <span className="text-[11px] text-green-600">Verified</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {review.products?.name || "Product"}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(review.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>

                    {review.comment && (
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    {/* Review Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {review.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="w-16 h-16 rounded-lg overflow-hidden border bg-muted"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Existing Replies */}
                    {review.review_replies.length > 0 && (
                      <div className="ml-4 space-y-2 border-l-2 border-muted pl-4">
                        {review.review_replies.map((reply) => (
                          <div key={reply.id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Your reply</span>
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(reply.created_at), "MMM dd, yyyy")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === review.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReply(review.id)}
                            disabled={submittingReply || !replyText.trim()}
                          >
                            {submittingReply ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Post Reply"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReplyingTo(null); setReplyText("") }}
                            disabled={submittingReply}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      review.review_replies.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() => setReplyingTo(review.id)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Reply
                        </Button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
