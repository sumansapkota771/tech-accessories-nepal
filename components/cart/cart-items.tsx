"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Trash2, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { CartItem } from "@/lib/types"

interface CartItemsProps {
  items: CartItem[]
}

export function CartItems({ items }: CartItemsProps) {
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setLoadingItems((prev) => new Set(prev).add(itemId))

    try {
      const { error } = await supabase.from("cart_items").update({ quantity: newQuantity }).eq("id", itemId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const removeItem = async (itemId: string) => {
    setLoadingItems((prev) => new Set(prev).add(itemId))

    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId)

      if (error) throw error

      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // Group items by vendor
  const vendorGroups = new Map<string, { vendorName: string; items: CartItem[] }>()
  const ungroupedItems: CartItem[] = []

  for (const item of items) {
    const vendor = item.products?.vendors
    if (vendor && "store_name" in vendor) {
      const vendorId = item.products?.vendor_id || "unknown"
      const group = vendorGroups.get(vendorId)
      if (group) {
        group.items.push(item)
      } else {
        vendorGroups.set(vendorId, {
          vendorName: (vendor as { store_name: string }).store_name,
          items: [item],
        })
      }
    } else {
      ungroupedItems.push(item)
    }
  }

  const renderItems = (groupItems: CartItem[], showVendorHeader = false, vendorName?: string) => (
    <>
      {showVendorHeader && vendorName && (
        <div className="flex items-center gap-2 mb-3">
          <Store className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{vendorName}</span>
          <Badge variant="secondary" className="text-xs">
            {groupItems.length} item{groupItems.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}
      {groupItems.map((item, index) => {
        const product = item.products
        if (!product) return null

        const isLoading = loadingItems.has(item.id)
        const itemTotal = product.price * item.quantity

        return (
          <div key={item.id}>
            <div className="flex gap-4">
              <Link
                href={`/products/${product.id}`}
                className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative"
              >
                <Image
                  src={product.image_url || "/placeholder.svg?height=80&width=80"}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${product.id}`}
                  className="font-semibold text-sm mb-1 line-clamp-2 hover:text-primary transition-colors block"
                >
                  {product.name}
                </Link>
                <p className="text-sm text-muted-foreground mb-2">Rs. {product.price.toLocaleString()}</p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={isLoading || item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={isLoading || item.quantity >= product.stock_quantity}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {product.stock_quantity === 0 && (
                  <p className="text-xs text-destructive mt-1 font-medium">Out of stock — remove this item</p>
                )}
                {product.stock_quantity > 0 && product.stock_quantity < 5 && (
                  <p className="text-xs text-orange-600 mt-1">Only {product.stock_quantity} left in stock</p>
                )}
                {item.quantity > product.stock_quantity && product.stock_quantity > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Quantity reduced to {product.stock_quantity} (insufficient stock)
                  </p>
                )}
              </div>

              <div className="text-right flex flex-col justify-between">
                <p className="font-semibold">Rs. {itemTotal.toLocaleString()}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  disabled={isLoading}
                  aria-label={`Remove ${product.name} from cart`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {index < groupItems.length - 1 && <Separator className="mt-6" />}
          </div>
        )
      })}
    </>
  )

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Grouped vendor items */}
          {Array.from(vendorGroups.entries()).map(([vendorId, group], groupIndex) => (
            <div key={vendorId}>
              {renderItems(group.items, true, group.vendorName)}
              {groupIndex < vendorGroups.size - 1 && <Separator className="mt-6" />}
              {groupIndex < vendorGroups.size - 1 && ungroupedItems.length === 0 && <Separator className="mt-6" />}
            </div>
          ))}

          {/* Unassigned items */}
          {ungroupedItems.length > 0 && (
            <div>
              {renderItems(ungroupedItems)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
