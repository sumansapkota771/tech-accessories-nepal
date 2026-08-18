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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ui/image-upload"
import { createBrowserClient } from "@/lib/supabase/client"
import { createProduct, updateProduct, submitProductForQC } from "@/lib/actions/products"
import type { Product, Category, ProductStatus } from "@/lib/types"
import { Plus, Edit, Trash2, Search, Send, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VendorProductsProps {
  vendorId: string
}

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

export function VendorProducts({ vendorId }: VendorProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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
        .select(`*, categories ( id, name )`)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" })
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
      const result = await import("@/lib/actions/products").then((m) => m.deleteProduct(id))
      if (result.error) throw new Error(result.error)

      setProducts(products.filter((p) => p.id !== id))
      toast({ title: "Success", description: "Product deleted successfully" })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" })
    }
  }

  async function handleSubmitForQC(id: string) {
    try {
      const result = await submitProductForQC(id)
      if (result.error) throw new Error(result.error)

      toast({ title: "Success", description: "Product submitted for QC review" })
      fetchProducts()
    } catch (error) {
      console.error("Error submitting for QC:", error)
      toast({ title: "Error", description: "Failed to submit for review", variant: "destructive" })
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || product.product_status === statusFilter),
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Manage your product listings</CardDescription>
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
            <CardDescription>Manage your product listings</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Create a new listing. You can save as draft or submit for review.</DialogDescription>
              </DialogHeader>
              <VendorProductForm
                vendorId={vendorId}
                categories={categories}
                onSuccess={() => {
                  setIsAddDialogOpen(false)
                  fetchProducts()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
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
                        {product.brand && (
                          <div className="text-xs text-muted-foreground">{product.brand}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.categories?.name || "Uncategorized"}</Badge>
                  </TableCell>
                  <TableCell>Rs. {product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.stock_quantity <= product.low_stock_threshold ? "destructive" : "default"}
                    >
                      {product.stock_quantity} in stock
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[product.product_status] || "secondary"}>
                      {STATUS_LABELS[product.product_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(product.product_status === "draft" || product.product_status === "qc_changes_requested" || product.product_status === "qc_rejected") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitForQC(product.id)}
                          title="Submit for QC review"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter !== "all" ? "No products with this status" : "No products yet"}
            </p>
          </div>
        )}

        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>Editing a published listing may require re-review.</DialogDescription>
              </DialogHeader>
              <VendorProductForm
                vendorId={vendorId}
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
      </CardContent>
    </Card>
  )
}

interface VendorProductFormProps {
  vendorId: string
  product?: Product
  categories: Category[]
  onSuccess: () => void
}

function VendorProductForm({ vendorId, product, categories, onSuccess }: VendorProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    original_price: product?.original_price || "",
    stock_quantity: product?.stock_quantity || 0,
    category_id: product?.category_id || null,
    image_url: product?.image_url || "",
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    brand: product?.brand || "",
    sku: product?.sku || "",
    condition: (product?.condition || "new") as "new" | "refurbished" | "used",
    warranty: product?.warranty || "",
    video_url: product?.video_url || "",
    delivery_info: product?.delivery_info || "",
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    specifications: product?.specifications ? JSON.stringify(product.specifications, null, 2) : "",
    product_status: (product?.product_status || "draft") as "draft" | "pending" | "unpublished",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let specs = null
      if (formData.specifications.trim()) {
        try {
          specs = JSON.parse(formData.specifications)
        } catch {
          toast({ title: "Error", description: "Invalid JSON in specifications", variant: "destructive" })
          setLoading(false)
          return
        }
      }

      const dataToSave = {
        ...formData,
        original_price: formData.original_price ? Number(formData.original_price) : null,
        category_id: formData.category_id || null,
        specifications: specs,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
      }

      if (product) {
        const result = await updateProduct(product.id, dataToSave)
        if (result.error) throw new Error(result.error)
        toast({ title: "Success", description: "Product updated" })
      } else {
        const result = await createProduct({ ...dataToSave, vendor_id: vendorId })
        if (result.error) throw new Error(result.error)
        toast({ title: "Success", description: "Product created" })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving product:", error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save product", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="e.g. Apple, Samsung"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (Rs.) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="original_price">Compare-at Price (Rs.)</Label>
          <Input
            id="original_price"
            type="number"
            step="0.01"
            value={formData.original_price}
            onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Stock keeping unit"
          />
        </div>
      </div>

      {/* Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Quantity *</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="low_stock">Low Stock Alert Threshold</Label>
          <Input
            id="low_stock"
            type="number"
            value={formData.low_stock_threshold}
            onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Category & Condition */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.parent_id ? "\u00A0\u00A0└ " : ""}{category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select
            value={formData.condition}
            onValueChange={(value) => setFormData({ ...formData, condition: value as "new" | "refurbished" | "used" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="refurbished">Refurbished</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image */}
      <ImageUpload
        label="Product Image"
        value={formData.image_url}
        onChange={(url) => setFormData({ ...formData, image_url: url })}
        folder="products"
      />

      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="warranty">Warranty</Label>
          <Input
            id="warranty"
            value={formData.warranty}
            onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
            placeholder="e.g. 1 year manufacturer warranty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delivery_info">Delivery Info</Label>
          <Input
            id="delivery_info"
            value={formData.delivery_info}
            onChange={(e) => setFormData({ ...formData, delivery_info: e.target.value })}
            placeholder="e.g. Free delivery in Kathmandu"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL</Label>
        <Input
          id="video_url"
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          placeholder="YouTube or Vimeo URL"
        />
      </div>

      {/* Specifications */}
      <div className="space-y-2">
        <Label htmlFor="specs">Specifications (JSON)</Label>
        <Textarea
          id="specs"
          value={formData.specifications}
          onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
          rows={4}
          placeholder={'{"Material": "TPU", "Compatibility": "iPhone 15 Pro"}'}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">Enter as JSON key-value pairs</p>
      </div>

      {/* Status & Flags */}
      <div className="flex items-center gap-6">
        <div className="space-y-2 flex-1">
          <Label htmlFor="product_status">Save as</Label>
          <Select
            value={formData.product_status}
            onValueChange={(value) => setFormData({ ...formData, product_status: value as "draft" | "pending" | "unpublished" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft (not visible)</SelectItem>
              <SelectItem value="pending">Submit for review</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 pt-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
            />
            <span className="text-sm">Featured</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  )
}
