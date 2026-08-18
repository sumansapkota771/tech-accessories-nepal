"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ui/image-upload"
import { createBrowserClient } from "@/lib/supabase/client"
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories"
import type { Category } from "@/lib/types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faPen, faTrash, faMagnifyingGlass, faTag, faChevronRight, faChevronDown } from "@fortawesome/free-solid-svg-icons"
import { useToast } from "@/hooks/use-toast"

interface CategoryWithCount extends Category {
  product_count?: number
}

export function AdminCategories() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name")

      if (categoriesError) throw categoriesError

      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id)
            .eq("is_deleted", false)

          return { ...category, product_count: count || 0 }
        }),
      )

      setCategories(categoriesWithCounts)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    const subcategories = categories.filter((c) => c.parent_id === id)
    if (subcategories.length > 0) {
      toast({
        title: "Cannot delete",
        description: "Remove subcategories first before deleting this category",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Delete this category? Products in this category will become uncategorized.")) return

    try {
      const result = await deleteCategory(id)
      if (result.error) throw new Error(result.error)

      setCategories(categories.filter((c) => c.id !== id))
      toast({ title: "Success", description: "Category deleted" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  function toggleParent(id: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build hierarchy
  const { topLevel, childMap } = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_id)
    const children = new Map<string, CategoryWithCount[]>()
    for (const cat of categories) {
      if (cat.parent_id) {
        const list = children.get(cat.parent_id) || []
        list.push(cat)
        children.set(cat.parent_id, list)
      }
    }
    return { topLevel: parents, childMap: children }
  }, [categories])

  const filteredTopLevel = topLevel.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Manage your product categories</CardDescription>
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
            <CardTitle>Categories</CardTitle>
            <CardDescription>Manage your product categories with hierarchy</CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopLevel.map((category) => {
                const children = childMap.get(category.id) || []
                const isExpanded = expandedParents.has(category.id)

                return (
                  <>
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {children.length > 0 ? (
                            <button
                              onClick={() => toggleParent(category.id)}
                              className="h-4 w-4 text-muted-foreground hover:text-foreground"
                            >
                              <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="w-4" />
                          )}
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faTag} className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {category.description?.substring(0, 40) || "No description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{category.slug || "—"}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category.product_count || 0}</Badge>
                      </TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setEditingCategory(category)}>
                            <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      children.map((child) => (
                        <TableRow key={child.id} className="bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2 pl-8">
                              <span className="text-muted-foreground">└</span>
                              <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                                <FontAwesomeIcon icon={faTag} className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{child.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {child.description?.substring(0, 40) || "No description"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{child.slug || "—"}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{child.product_count || 0}</Badge>
                          </TableCell>
                          <TableCell>{child.sort_order}</TableCell>
                          <TableCell>
                            <Badge variant={child.is_active ? "default" : "secondary"}>
                              {child.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => setEditingCategory(child)}>
                                <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteCategory(child.id)}>
                                <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {filteredTopLevel.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No categories found</div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>Create a new product category</DialogDescription>
            </DialogHeader>
            <CategoryForm
              categories={topLevel}
              onSuccess={() => {
                setIsAddDialogOpen(false)
                fetchCategories()
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        {editingCategory && (
          <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>Update category information</DialogDescription>
              </DialogHeader>
              <CategoryForm
                category={editingCategory}
                categories={topLevel.filter((c) => c.id !== editingCategory.id)}
                onSuccess={() => {
                  setEditingCategory(null)
                  fetchCategories()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

interface CategoryFormProps {
  category?: Category
  categories: Category[]
  onSuccess: () => void
}

function CategoryForm({ category, categories, onSuccess }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    image_url: category?.image_url || "",
    is_active: category?.is_active ?? true,
    parent_id: category?.parent_id || null as string | null,
    sort_order: category?.sort_order ?? 0,
    meta_title: category?.meta_title || "",
    meta_description: category?.meta_description || "",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (category) {
        const result = await updateCategory(category.id, {
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active,
          parent_id: formData.parent_id || null,
          sort_order: formData.sort_order,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
        })
        if (result.error) throw new Error(result.error)
        toast({ title: "Success", description: "Category updated" })
      } else {
        const result = await createCategory(
          formData.name,
          formData.description || undefined,
          formData.parent_id || undefined,
          formData.sort_order,
          formData.meta_title || undefined,
          formData.meta_description || undefined,
        )
        if (result.error) throw new Error(result.error)
        toast({ title: "Success", description: "Category created" })
      }

      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Category Name *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent">Parent Category</Label>
          <Select
            value={formData.parent_id || "none"}
            onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="None (top-level)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (top-level)</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
      </div>

      <ImageUpload
        label="Category Image"
        value={formData.image_url}
        onChange={(url) => setFormData({ ...formData, image_url: url })}
        folder="categories"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Display Order</Label>
          <Input id="sort_order" type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span>Active</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta_title">SEO Title</Label>
        <Input id="meta_title" value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} placeholder="Optional" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta_desc">SEO Description</Label>
        <Textarea id="meta_desc" value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={2} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : category ? "Update" : "Create"}</Button>
      </div>
    </form>
  )
}
