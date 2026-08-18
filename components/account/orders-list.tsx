"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, RotateCcw, X } from "lucide-react"
import { cancelOrder } from "@/lib/actions/orders"
import { getStatusColor, formatStatus } from "@/lib/order-utils"
import type { Order, OrderItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"

interface OrdersListProps {
  orders: (Order & {
    order_items: (OrderItem & {
      products: {
        id: string
        name: string
        image_url: string | null
      } | null
    })[]
    suborders?: {
      id: string
      vendor_id: string
      status: string
      subtotal: number
      vendors: { store_name: string; slug: string } | null
    }[]
  })[]
}

export function OrdersList({ orders }: OrdersListProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const router = useRouter()

  const handleReorder = async (order: Order & {
    order_items: (OrderItem & {
      products: { id: string; name: string; image_url: string | null } | null
    })[]
  }) => {
    setIsLoading(order.id)
    try {
      const cartItems = order.order_items.map((item) => ({
        user_id: order.user_id,
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const { error } = await supabase
        .from("cart_items")
        .upsert(cartItems, { onConflict: "user_id,product_id" })

      if (error) throw error

      toast({ title: "Items added to cart", description: "All items from this order have been added to your cart." })
      router.push("/cart")
    } catch (error) {
      console.error("Error reordering:", error)
      toast({ title: "Error", description: "Failed to add items to cart.", variant: "destructive" })
    } finally {
      setIsLoading(null)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    setIsLoading(orderId)
    try {
      const result = await cancelOrder(orderId)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Order cancelled", description: "Your order has been cancelled successfully." })
      router.refresh()
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel order.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(order.status)}>
                  {formatStatus(order.status)}
                </Badge>
                <div className="text-right">
                  <p className="font-semibold">Rs. {order.total_amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Per-vendor fulfillment status */}
              {order.suborders && order.suborders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {order.suborders.map((suborder) => (
                    <Badge key={suborder.id} variant="outline" className={getStatusColor(suborder.status)}>
                      {suborder.vendors?.store_name || "Store"}: {formatStatus(suborder.status)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Order Items Preview */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {order.order_items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
                    <img
                      src={item.products?.image_url || "/placeholder.svg?height=64&width=64"}
                      alt={item.products?.name || "Product"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {order.order_items.length > 3 && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{order.order_items.length - 3}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orders/${order.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>

                {(order.status === "pending" || order.status === "confirmed") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={isLoading === order.id}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    {isLoading === order.id ? "Cancelling..." : "Cancel Order"}
                  </Button>
                )}

                {(order.status === "delivered" || order.status === "completed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReorder(order)}
                    disabled={isLoading === order.id}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isLoading === order.id ? "Adding..." : "Reorder"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
