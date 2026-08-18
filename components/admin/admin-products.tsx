"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ui/image-upload"
import { createBrowserClient } from "@/lib/supabase/client"
import { reviewProductQC, updateProductStatus, deleteProduct } from "@/lib/actions/products"
import { updateProductAdmin } from "@/lib/actions/admin"
import type { Product, Category, ProductStatus } from "@/lib/types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faPen, faTrash, faMagnifyingGlass, faCheck, faXmark, faEye } from "@fortawesome/free-solid-svg-icons"
import { useToast } from "@/hooks/use-toast"

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "secondary",
  qc_changes_requested: "destructive",
  qc_rejected: "destructive",
  approved: "default",
  published: "default",
  unpublished: "secondary",
  suspended: "destructive",
  deleted: "destructive",
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  pending: "Pending QC",
  qc_changes_requested: "Changes Requested",
  qc_rejected: "QC Rejected",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  suspended: "Suspended",
  deleted: "Deleted",
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [qcDialogProduct, setQcDialogProduct] = useState<Product | null>(null)
  const [qcAction, setQcAction] = useState<"approve" | "request_changes" | "reject">("approve")
  const [qcNotes, setQcNotes] = useState("")
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories ( id, name ),
          vendors ( id, store_name, user_id )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name")
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const result = await deleteProduct(id)
      if (result.error) throw new Error(result.error)

      setProducts(products.filter((p) => p.id !== id))
      toast({ title: "Success", description: "Product deleted" })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" })
    }
  }

  async function handleQCReview() {
    if (!qcDialogProduct) return

    try {
      const result = await reviewProductQC(qcDialogProduct.id, qcAction, qcNotes || undefined)
      if (result.error) throw new Error(result.error)

      toast({
        title: "Success",
        description: qcAction === "approve" ? "Product approved" : qcAction === "reject" ? "Product rejected" : "Changes requested",
      })
      setQcDialogProduct(null)
      setQcNotes("")
      fetchProducts()
    } catch (error) {
      console.error("Error reviewing product:", error)
      toast({ title: "Error", description: "Failed to review product", variant: "destructive" })
    }
  }

  async function handleStatusChange(id: string, newStatus: ProductStatus) {
    try {
      const result = await updateProductStatus(id, newStatus)
      if (result.error) throw new Error(result.error)

      toast({ title: "Success", description: `Product ${STATUS_LABELS[newStatus].toLowerCase()}` })
      fetchProducts()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.vendors?.store_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || product.product_status === statusFilter),
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Manage product listings across all vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>Manage product listings across all vendors</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).filter(([k]) => k !== "deleted").map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <img
                        src={product.image_url || "/placeholder.svg?height=40&width=40"}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.brand && <span>{product.brand} · </span>}
                          {product.sku || "No SKU"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{product.vendors?.store_name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.categories?.name || "—"}</Badge>
                  </TableCell>
                  <TableCell>Rs. {product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.stock_quantity <= product.low_stock_threshold ? "destructive" : "default"}
                    >
                      {product.stock_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[product.product_status] || "secondary"}>
                      {STATUS_LABELS[product.product_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {product.product_status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQcDialogProduct(product)
                            setQcAction("approve")
                            setQcNotes("")
                          }}
                          title="Review product"
                        >
                          <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                        </Button>
                      )}
                      {product.product_status === "approved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(product.id, "published")}
                          title="Publish"
                        >
                          <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                        </Button>
                      )}
                      {product.product_status === "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(product.id, "unpublished")}
                          title="Unpublish"
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                        <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No products match your filters
          </div>
        )}

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>Update product information</DialogDescription>
              </DialogHeader>
              <AdminProductForm
                product={editingProduct}
                categories={categories}
                onSuccess={() => {
                  setEditingProduct(null)
                  fetchProducts()
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* QC Review Dialog */}
        {qcDialogProduct && (
          <Dialog open={!!qcDialogProduct} onOpenChange={() => setQcDialogProduct(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Quality Check Review</DialogTitle>
                <DialogDescription>
                  Reviewing: {qcDialogProduct.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <img
                    src={qcDialogProduct.image_url || "/placeholder.svg?height=60&width=60"}
                    alt={qcDialogProduct.name}
                    className="h-14 w-14 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{qcDialogProduct.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Rs. {qcDialogProduct.price.toLocaleString()} · {qcDialogProduct.stock_quantity} in stock
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={qcAction} onValueChange={(v) => setQcAction(v as typeof qcAction)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve & Publish</SelectItem>
                      <SelectItem value="request_changes">Request Changes</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes {qcAction !== "approve" ? "(required)" : ""}</Label>
                  <Textarea
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    placeholder={
                      qcAction === "approve"
                        ? "Optional: positive feedback for the vendor"
                        : qcAction === "request_changes"
                          ? "Describe what needs to be changed"
                          : "Explain why this product is rejected"
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setQcDialogProduct(null)}>Cancel</Button>
                <Button
                  variant={qcAction === "reject" ? "destructive" : "default"}
                  onClick={handleQCReview}
                  disabled={qcAction !== "approve" && !qcNotes.trim()}
                >
                  {qcAction === "approve" ? "Approve" : qcAction === "reject" ? "Reject" : "Request Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

interface AdminProductFormProps {
  product: Product
  categories: Category[]
  onSuccess: () => void
}

function AdminProductForm({ product, categories, onSuccess }: AdminProductFormProps) {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || "",
    price: product.price,
    original_price: product.original_price || "",
    stock_quantity: product.stock_quantity,
    category_id: product.category_id,
    image_url: product.image_url || "",
    is_active: product.is_active,
    is_featured: product.is_featured,
    brand: product.brand || "",
    sku: product.sku || "",
    condition: product.condition,
    warranty: product.warranty || "",
    low_stock_threshold: product.low_stock_threshold,
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateProductAdmin(product.id, {
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        original_price: formData.original_price ? Number(formData.original_price) : null,
        stock_quantity: formData.stock_quantity,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        brand: formData.brand || null,
        sku: formData.sku || null,
        condition: formData.condition,
        warranty: formData.warranty || null,
        low_stock_threshold: formData.low_stock_threshold,
      })

      if (!result.success) throw new Error(result.error)

      toast({ title: "Success", description: "Product updated" })
      onSuccess()
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save product", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Price (Rs.)</Label>
          <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required />
        </div>
        <div className="space-y-2">
          <Label>Compare-at Price</Label>
          <Input type="number" step="0.01" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Stock</Label>
          <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })} required />
        </div>
        <div className="space-y-2">
          <Label>Low Stock Alert</Label>
          <Input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ImageUpload label="Product Image" value={formData.image_url} onChange={(url) => setFormData({ ...formData, image_url: url })} folder="products" />

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
          <span>Active</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} />
          <span>Featured</span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Update"}</Button>
      </div>
    </form>
  )
}
