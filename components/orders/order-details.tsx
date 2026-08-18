"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Package, MapPin, CreditCard, RotateCcw, X, Download, MessageCircle, Truck, Clock, CheckCircle2 } from "lucide-react"
import { OrderStatusStepper } from "@/components/orders/order-status-stepper"
import { getOrderTimeline, cancelOrder, reorderOrder } from "@/lib/actions/orders"
import { getStatusColor, formatStatus } from "@/lib/order-utils"
import type { Order, OrderItem, OrderEvent } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface OrderDetailsProps {
  order: Order & {
    order_items: (OrderItem & {
      products: {
        id: string
        name: string
        image_url: string | null
        price: number
      } | null
    })[]
    suborders?: {
      id: string
      vendor_id: string
      status: string
      subtotal: number
      delivery_charge: number
      estimated_delivery_time: string | null
      tracking_number: string | null
      vendors: { store_name: string; slug: string } | null
    }[]
  }
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [timeline, setTimeline] = useState<OrderEvent[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    getOrderTimeline(order.id).then(setTimeline)
  }, [order.id])

  const handleCancelOrder = async () => {
    if (order.status !== "pending" && order.status !== "confirmed") {
      toast({
        title: "Cannot cancel order",
        description: "Only pending or confirmed orders can be cancelled.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await cancelOrder(order.id)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({ title: "Order cancelled", description: "Your order has been cancelled." })
      router.refresh()
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({ title: "Error", description: "Failed to cancel order.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReorder = async () => {
    setIsLoading(true)
    try {
      const result = await reorderOrder(order.id)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({ title: "Items added to cart", description: "All items from this order have been added to your cart." })
      router.push("/cart")
    } catch (error) {
      console.error("Error reordering:", error)
      toast({ title: "Error", description: "Failed to add items to cart.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadInvoice = () => {
    toast({ title: "Invoice download", description: "Invoice download feature coming soon!" })
  }

  const shippingAddress = order.shipping_address as Record<string, unknown>

  const itemsBySuborder = new Map<string, typeof order.order_items>()
  const unassignedItems: typeof order.order_items = []
  for (const item of order.order_items) {
    if (item.suborder_id) {
      const group = itemsBySuborder.get(item.suborder_id) || []
      group.push(item)
      itemsBySuborder.set(item.suborder_id, group)
    } else {
      unassignedItems.push(item)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Order #{order.id.slice(-8)}</h1>
          <Badge className={getStatusColor(order.status)}>
            {formatStatus(order.status)}
          </Badge>
        </div>
        <p className="text-muted-foreground">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
      </div>

      {/* Master Order Stepper */}
      <div className="mb-8">
        <OrderStatusStepper status={order.status} />
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          {(order.status === "pending" || order.status === "confirmed") && (
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Order
            </Button>
          )}

          {(order.status === "delivered" || order.status === "completed") && (
            <Button
              variant="outline"
              onClick={handleReorder}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reorder Items
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Invoice
          </Button>

          <Button
            variant="outline"
            onClick={() => toast({ title: "Contact Support", description: "Support feature coming soon!" })}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {order.suborders && order.suborders.length > 0
                ? order.suborders.map((suborder) => (
                    <div key={suborder.id} className="space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-sm font-medium">{suborder.vendors?.store_name || "Store"}</span>
                        <Badge className={getStatusColor(suborder.status)}>
                          {formatStatus(suborder.status)}
                        </Badge>
                      </div>
                      <OrderStatusStepper status={suborder.status} isSuborder className="pb-2" />
                      {suborder.tracking_number && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-1">
                          <Truck className="h-3.5 w-3.5" />
                          Tracking: <span className="font-medium text-foreground">{suborder.tracking_number}</span>
                        </p>
                      )}
                      {suborder.estimated_delivery_time && (
                        <p className="text-xs text-muted-foreground">
                          Est. delivery: {suborder.estimated_delivery_time}
                        </p>
                      )}
                      <div className="border-b" />
                      {(itemsBySuborder.get(suborder.id) || []).map((item) => {
                        const product = item.products
                        if (!product) return null
                        return (
                          <div key={item.id} className="flex gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={product.image_url || "/placeholder.svg?height=64&width=64"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity} x Rs. {item.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                : null}

              {unassignedItems.map((item) => {
                const product = item.products
                if (!product) return null
                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={product.image_url || "/placeholder.svg?height=64&width=64"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} x Rs. {item.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Order Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">
                          {formatStatus(event.event_type)}
                        </p>
                        {event.old_status && event.new_status && (
                          <p className="text-xs text-muted-foreground">
                            {event.old_status.replace(/_/g, " ")} → {event.new_status.replace(/_/g, " ")}
                          </p>
                        )}
                        {event.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary & Details */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rs. {(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{(order.shipping_cost || 0) === 0 ? "Free" : `Rs. ${(order.shipping_cost || 0).toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (VAT 13%)</span>
                <span>Rs. {(order.tax_amount || 0).toLocaleString()}</span>
              </div>
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {order.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>Rs. {order.total_amount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{(shippingAddress?.full_name as string) || ""}</p>
                <p>{(shippingAddress?.phone as string) || ""}</p>
                <p>{(shippingAddress?.address as string) || ""}</p>
                <p>
                  {(shippingAddress?.city as string) || ""} {(shippingAddress?.postal_code as string) || ""}
                </p>
                {(shippingAddress?.notes as string) && (
                  <p className="text-muted-foreground mt-2">Note: {shippingAddress.notes as string}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment & Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment & Order Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Payment Method</span>
                <span className="capitalize">{order.payment_method || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Status</span>
                <Badge variant="outline" className="text-xs">
                  {formatStatus(order.payment_status)}
                </Badge>
              </div>
              {order.delivery_method && (
                <div className="flex justify-between text-sm">
                  <span>Delivery Method</span>
                  <span className="capitalize">{order.delivery_method.replace(/_/g, " ")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Order Date</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
