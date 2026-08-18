"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { reviewProductQC } from "@/lib/actions/products"
import type { Product, ProductStatus } from "@/lib/types"
import { Check, X, MessageSquare, Clock, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdminQualityControl() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"pending" | "qc_changes_requested" | "all_submitted">("pending")
  const [reviewDialogProduct, setReviewDialogProduct] = useState<Product | null>(null)
  const [reviewAction, setReviewAction] = useState<"approve" | "request_changes" | "reject">("approve")
  const [reviewNotes, setReviewNotes] = useState("")
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingProducts()
  }, [filter])

  async function fetchPendingProducts() {
    setLoading(true)
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          categories ( id, name ),
          vendors ( id, store_name, user_id )
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })

      if (filter === "pending") {
        query = query.eq("product_status", "pending")
      } else if (filter === "qc_changes_requested") {
        query = query.eq("product_status", "qc_changes_requested")
      } else {
        query = query.in("product_status", ["pending", "qc_changes_requested", "qc_rejected"])
      }

      const { data, error } = await query
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching QC products:", error)
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleReview() {
    if (!reviewDialogProduct) return

    try {
      const result = await reviewProductQC(reviewDialogProduct.id, reviewAction, reviewNotes || undefined)
      if (result.error) throw new Error(result.error)

      toast({
        title: "Success",
        description:
          reviewAction === "approve"
            ? "Product approved and published"
            : reviewAction === "reject"
              ? "Product rejected"
              : "Changes requested from vendor",
      })
      setReviewDialogProduct(null)
      setReviewNotes("")
      fetchPendingProducts()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to review",
        variant: "destructive",
      })
    }
  }

  const pendingCount = products.filter((p) => p.product_status === "pending").length
  const changesCount = products.filter((p) => p.product_status === "qc_changes_requested").length
  const rejectedCount = products.filter((p) => p.product_status === "qc_rejected").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quality Control</CardTitle>
            <CardDescription>Review products submitted by vendors</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${filter === "pending" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            onClick={() => setFilter("pending")}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Pending Review</span>
            </div>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </div>
          <div
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${filter === "qc_changes_requested" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            onClick={() => setFilter("qc_changes_requested")}
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Changes Requested</span>
            </div>
            <p className="text-2xl font-bold">{changesCount}</p>
          </div>
          <div
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${filter === "all_submitted" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            onClick={() => setFilter("all_submitted")}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">All Submitted</span>
            </div>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
        </div>

        {/* Product List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No products need review right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <img
                  src={product.image_url || "/placeholder.svg?height=60&width=60"}
                  alt={product.name}
                  className="h-14 w-14 rounded object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <Badge
                      variant={
                        product.product_status === "pending"
                          ? "secondary"
                          : product.product_status === "qc_changes_requested"
                            ? "destructive"
                            : "destructive"
                      }
                    >
                      {product.product_status === "pending"
                        ? "Pending"
                        : product.product_status === "qc_changes_requested"
                          ? "Changes Requested"
                          : "Rejected"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.vendors?.store_name || "Unknown vendor"} · Rs. {product.price.toLocaleString()} · {product.stock_quantity} in stock
                  </div>
                  {product.brand && (
                    <div className="text-xs text-muted-foreground mt-0.5">Brand: {product.brand}</div>
                  )}
                  {product.qc_notes && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">
                      Previous notes: {product.qc_notes}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReviewDialogProduct(product)
                    setReviewAction("approve")
                    setReviewNotes("")
                  }}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        {reviewDialogProduct && (
          <Dialog open={!!reviewDialogProduct} onOpenChange={() => setReviewDialogProduct(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Quality Check Review</DialogTitle>
                <DialogDescription>{reviewDialogProduct.name}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-3 p-3 rounded-lg bg-muted">
                  <img
                    src={reviewDialogProduct.image_url || "/placeholder.svg?height=80&width=80"}
                    alt={reviewDialogProduct.name}
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{reviewDialogProduct.name}</div>
                    <div>Rs. {reviewDialogProduct.price.toLocaleString()}</div>
                    <div className="text-muted-foreground">{reviewDialogProduct.stock_quantity} in stock</div>
                    {reviewDialogProduct.brand && <div className="text-muted-foreground">Brand: {reviewDialogProduct.brand}</div>}
                    {reviewDialogProduct.sku && <div className="text-muted-foreground">SKU: {reviewDialogProduct.sku}</div>}
                    {reviewDialogProduct.warranty && <div className="text-muted-foreground">Warranty: {reviewDialogProduct.warranty}</div>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={reviewAction} onValueChange={(v) => setReviewAction(v as typeof reviewAction)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve & Publish</SelectItem>
                      <SelectItem value="request_changes">Request Changes</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes {reviewAction !== "approve" ? "(required)" : ""}</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      reviewAction === "approve"
                        ? "Optional positive feedback"
                        : reviewAction === "request_changes"
                          ? "What needs to change?"
                          : "Why is this rejected?"
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewDialogProduct(null)}>Cancel</Button>
                <Button
                  variant={reviewAction === "reject" ? "destructive" : "default"}
                  onClick={handleReview}
                  disabled={reviewAction !== "approve" && !reviewNotes.trim()}
                >
                  {reviewAction === "approve" ? "Approve" : reviewAction === "reject" ? "Reject" : "Request Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
