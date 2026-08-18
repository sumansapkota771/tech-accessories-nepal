"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SlidersHorizontal, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"

export function ProductsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "")
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("category")?.split(",").filter(Boolean) || [],
  )
  const [inStockOnly, setInStockOnly] = useState(searchParams.get("in_stock") === "true")
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get("featured") === "true")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("categories").select("*").order("name")
    if (!error && data) {
      setCategories(data)
    }
  }

  const updateFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (minPrice) params.set("min_price", minPrice)
    else params.delete("min_price")

    if (maxPrice) params.set("max_price", maxPrice)
    else params.delete("max_price")

    if (selectedCategories.length > 0) {
      params.set("category", selectedCategories.join(","))
    } else {
      params.delete("category")
    }

    if (inStockOnly) params.set("in_stock", "true")
    else params.delete("in_stock")

    if (featuredOnly) params.set("featured", "true")
    else params.delete("featured")

    params.delete("page")
    router.push(`/products?${params.toString()}`)
    setOpen(false)
  }, [minPrice, maxPrice, selectedCategories, inStockOnly, featuredOnly, searchParams, router])

  const clearFilters = () => {
    setMinPrice("")
    setMaxPrice("")
    setSelectedCategories([])
    setInStockOnly(false)
    setFeaturedOnly(false)
    router.push("/products")
    setOpen(false)
  }

  const activeFilterCount =
    (selectedCategories.length > 0 ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (featuredOnly ? 1 : 0)

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId])
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId))
    }
  }

  const filterContent = (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Price Range (Rs.)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min-price" className="text-xs text-muted-foreground">Min</Label>
            <Input
              id="min-price"
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="max-price" className="text-xs text-muted-foreground">Max</Label>
            <Input
              id="max-price"
              type="number"
              placeholder="50000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Categories</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
              />
              <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Availability */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Availability</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={inStockOnly}
            onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
          />
          <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
            In stock only
          </Label>
        </div>
      </div>

      <Separator />

      {/* Featured */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured"
            checked={featuredOnly}
            onCheckedChange={(checked) => setFeaturedOnly(checked as boolean)}
          />
          <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
            Featured only
          </Label>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={updateFilters} className="w-full">
          Apply Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button onClick={clearFilters} variant="outline" className="w-full bg-transparent">
            Clear All
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Filters</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                Clear all
              </Button>
            )}
          </div>
          {filterContent}
        </div>
      </div>

      {/* Mobile trigger */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="flex-1" size="lg">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetTitle className="sr-only">Product Filters</SheetTitle>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {filterContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
