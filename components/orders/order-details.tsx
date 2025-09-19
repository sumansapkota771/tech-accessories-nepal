"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Package, MapPin, CreditCard, RotateCcw, X, Download, MessageCircle } from "lucide-react"
import type { Order, OrderItem } from "@/lib/types"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
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
  }
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCancelOrder = async () => {
    if (order.status !== "pending") {
      toast({
        title: "Cannot cancel order",
        description: "Only pending orders can be cancelled.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)

      if (error) throw error

      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReorder = async () => {
    setIsLoading(true)
    try {
      // Add all items from this order back to cart
      const cartItems = order.order_items.map((item) => ({
        user_id: order.user_id,
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const { error } = await supabase
        .from("cart_items")
        .upsert(cartItems, { onConflict: "user_id,product_id" })

      if (error) throw error

      toast({
        title: "Items added to cart",
        description: "All items from this order have been added to your cart.",
      })

      router.push("/cart")
    } catch (error) {
      console.error("Error reordering:", error)
      toast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadInvoice = () => {
    // This would typically generate and download a PDF invoice
    toast({
      title: "Invoice download",
      description: "Invoice download feature coming soon!",
    })
  }

  const handleContactSupport = () => {
    // This would typically open a support chat or redirect to contact page
    toast({
      title: "Contact Support",
      description: "Support feature coming soon!",
    })
  }

  const shippingAddress = order.shipping_address as any

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Order #{order.id.slice(-8)}</h1>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          {order.status === "pending" && (
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
          
          {order.status === "delivered" && (
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
            onClick={handleContactSupport}
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
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => {
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
                          Quantity: {item.quantity}  Rs. {item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
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
                <span>Rs. {(order.total_amount - 150 - Math.round(order.total_amount * 0.13)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>Rs. 150</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (VAT 13%)</span>
                <span>Rs. {Math.round(order.total_amount * 0.13).toLocaleString()}</span>
              </div>
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
                <p className="font-medium">{shippingAddress?.full_name}</p>
                <p>{shippingAddress?.phone}</p>
                <p>{shippingAddress?.address}</p>
                <p>
                  {shippingAddress?.city} {shippingAddress?.postal_code}
                </p>
                {shippingAddress?.notes && <p className="text-muted-foreground mt-2">Note: {shippingAddress.notes}</p>}
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
                <span className="capitalize">{order.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Status</span>
                <Badge variant="outline" className="text-xs">
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </Badge>
              </div>
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
