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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { moderateReview, resolveReport } from "@/lib/actions/reviews"
import { useToast } from "@/hooks/use-toast"
import type { AdminReviewItem, ReviewReport } from "@/lib/types"
import { Star, Flag, Eye, EyeOff, Trash2, Search, Loader2, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"

export function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([])
  const [reports, setReports] = useState<(ReviewReport & { reviews?: { comment: string | null; rating: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [moderatingId, setModeratingId] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [
        { data: reviewsData, error: reviewsError },
        { data: reportsData },
        { data: vendorsData },
      ] = await Promise.all([
        supabase
          .from("reviews")
          .select(`
            id,
            product_id,
            user_id,
            rating,
            comment,
            images,
            is_flagged,
            is_hidden,
            created_at,
            products(name, vendor_id),
            profiles!reviews_user_id_profiles_fkey(full_name, email)
          `)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("review_reports")
          .select("*, reviews(comment, rating)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("vendors")
          .select("id, store_name"),
      ])

      if (reviewsError) throw reviewsError

      const vendorMap = new Map<string, string>()
      for (const v of vendorsData || []) {
        vendorMap.set(v.id, v.store_name)
      }

      const reviewIds = (reviewsData || []).map((r: Record<string, unknown>) => r.id as string)
      const { data: replyCounts } = await supabase
        .from("review_replies")
        .select("review_id")
        .in("review_id", reviewIds)

      const replyCountMap = new Map<string, number>()
      for (const reply of replyCounts || []) {
        const rid = (reply as { review_id: string }).review_id
        replyCountMap.set(rid, (replyCountMap.get(rid) || 0) + 1)
      }

      const reportCountMap = new Map<string, number>()
      for (const report of reportsData || []) {
        const rid = (report as { review_id: string }).review_id
        reportCountMap.set(rid, (reportCountMap.get(rid) || 0) + 1)
      }

      const enriched: AdminReviewItem[] = (reviewsData || []).map((r: Record<string, unknown>) => {
        const products = r.products as { name: string; vendor_id: string } | null
        const profiles = r.profiles as { full_name: string | null; email: string } | null
        return {
          id: r.id as string,
          product_id: r.product_id as string,
          product_name: products?.name || "Product",
          user_id: r.user_id as string,
          user_name: profiles?.full_name || null,
          user_email: profiles?.email || null,
          vendor_id: products?.vendor_id || "",
          vendor_name: (products?.vendor_id && vendorMap.get(products.vendor_id)) || "Vendor",
          rating: r.rating as number,
          comment: r.comment as string | null,
          images: r.images as string[] | null,
          is_flagged: r.is_flagged as boolean,
          is_hidden: r.is_hidden as boolean,
          has_reply: (replyCountMap.get(r.id as string) || 0) > 0,
          report_count: reportCountMap.get(r.id as string) || 0,
          created_at: r.created_at as string,
        }
      })

      setReviews(enriched)
      setReports((reportsData || []) as any)
    } catch (err) {
      console.error("Error fetching data:", err)
      toast({ title: "Error", description: "Failed to load reviews.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchName = r.user_name?.toLowerCase().includes(term)
        const matchEmail = r.user_email?.toLowerCase().includes(term)
        const matchProduct = r.product_name.toLowerCase().includes(term)
        const matchVendor = r.vendor_name.toLowerCase().includes(term)
        const matchComment = r.comment?.toLowerCase().includes(term)
        if (!matchName && !matchEmail && !matchProduct && !matchVendor && !matchComment) return false
      }
      if (ratingFilter !== "all" && r.rating !== parseInt(ratingFilter)) return false
      if (statusFilter === "flagged" && !r.is_flagged) return false
      if (statusFilter === "hidden" && !r.is_hidden) return false
      if (statusFilter === "reported" && r.report_count === 0) return false
      if (statusFilter === "no_reply" && r.has_reply) return false
      return true
    })
  }, [reviews, searchTerm, ratingFilter, statusFilter])

  async function handleModerate(reviewId: string, action: "flag" | "unflag" | "hide" | "restore" | "delete") {
    if (action === "delete" && !confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return
    }

    setModeratingId(reviewId)
    try {
      const result = await moderateReview(reviewId, action)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Action completed", description: `Review ${action === "delete" ? "deleted" : "updated"}.` })
      await fetchData()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Action failed.", variant: "destructive" })
    } finally {
      setModeratingId(null)
    }
  }

  async function handleResolveReport(reportId: string, action: "resolve" | "dismiss") {
    try {
      const result = await resolveReport(reportId, action)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Report updated" })
      await fetchData()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Action failed.", variant: "destructive" })
    }
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ))
  }

  const pendingReports = reports.filter((r) => r.status === "pending")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>Loading reviews...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Reports Banner */}
      {pendingReports.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {pendingReports.length} pending report{pendingReports.length !== 1 ? "s" : ""} requiring review
                </p>
                <p className="text-xs text-orange-600">
                  Review flagged content and take appropriate action
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Product Reviews
          </CardTitle>
          <CardDescription>Moderate customer reviews across all products</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rating" />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="no_reply">No reply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mb-4">
            Showing {filteredReviews.length} of {reviews.length} reviews
          </p>

          {/* Reviews List */}
          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No reviews match the current filters.</p>
            ) : (
              filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className={`rounded-lg border p-4 space-y-2 ${
                    review.is_hidden ? "opacity-50" : ""
                  } ${review.is_flagged ? "border-orange-200" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{review.user_name || review.user_email || "User"}</p>
                        <Badge variant="secondary" className="text-[10px]">{review.product_name}</Badge>
                        <Badge variant="outline" className="text-[10px]">{review.vendor_name}</Badge>
                        {review.is_flagged && <Badge className="bg-orange-100 text-orange-800 text-[10px]">Flagged</Badge>}
                        {review.is_hidden && <Badge className="bg-gray-100 text-gray-800 text-[10px]">Hidden</Badge>}
                        {review.report_count > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">
                            {review.report_count} report{review.report_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {review.has_reply && (
                          <Badge className="bg-green-100 text-green-800 text-[10px]">Replied</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "MMM dd, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {moderatingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {!review.is_flagged ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Flag review"
                              onClick={() => handleModerate(review.id, "flag")}
                            >
                              <Flag className="h-3.5 w-3.5 text-orange-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Unflag review"
                              onClick={() => handleModerate(review.id, "unflag")}
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          {!review.is_hidden ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Hide review"
                              onClick={() => handleModerate(review.id, "hide")}
                            >
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Restore review"
                              onClick={() => handleModerate(review.id, "restore")}
                            >
                              <Eye className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Delete review"
                            onClick={() => handleModerate(review.id, "delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-foreground/80">{review.comment}</p>
                  )}

                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2">
                      {review.images.map((img, idx) => (
                        <div key={idx} className="w-12 h-12 rounded border overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Section */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Review Reports
            </CardTitle>
            <CardDescription>Manage reported reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`rounded-lg border p-4 space-y-2 ${
                    report.status === "pending" ? "border-orange-200" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.status === "pending" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {report.reason}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                      )}
                      {report.reviews && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Review: &ldquo;{report.reviews.comment?.slice(0, 100) || "(no comment)"}&rdquo; — {report.reviews.rating} stars
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Reported {format(new Date(report.created_at), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                    {report.status === "pending" && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleResolveReport(report.id, "resolve")}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleResolveReport(report.id, "dismiss")}
                        >
                          <XCircle className="h-3 w-3" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
