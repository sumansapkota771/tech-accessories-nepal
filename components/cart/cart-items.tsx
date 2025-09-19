"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2 } from "lucide-react"
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {items.map((item: CartItem, index) => {
            const product = item.products
            if (!product) return null

            const isLoading = loadingItems.has(item.id)
            const itemTotal = product.price * item.quantity

            return (
              <div key={item.id}>
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={product.image_url || "/placeholder.svg?height=80&width=80"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Rs. {product.price.toLocaleString()}</p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isLoading || item.quantity <= 1}
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
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {product.stock_quantity < 5 && (
                      <p className="text-xs text-orange-600 mt-1">Only {product.stock_quantity} left in stock</p>
                    )}
                  </div>

                  {/* Price and Actions */}
                  <div className="text-right flex flex-col justify-between">
                    <p className="font-semibold">Rs. {itemTotal.toLocaleString()}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {index < items.length - 1 && <Separator className="mt-6" />}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
