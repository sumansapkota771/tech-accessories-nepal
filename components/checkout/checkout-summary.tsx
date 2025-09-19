import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag } from "lucide-react"
import type { CartItem } from "@/lib/types"

interface CheckoutSummaryProps {
  items: CartItem[]
}

export function CheckoutSummary({ items }: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.products?.price || 0) * item.quantity
  }, 0)

  const shippingCost = subtotal >= 5000 ? 0 : 150
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + shippingCost + tax

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const product = item.products
            if (!product) return null

            return (
              <div key={item.id} className="flex gap-3">
                <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={product.image_url || "/placeholder.svg?height=48&width=48"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium">Rs. {(product.price * item.quantity).toLocaleString()}</p>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>{shippingCost === 0 ? "Free" : `Rs. ${shippingCost.toLocaleString()}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (VAT 13%)</span>
            <span>Rs. {tax.toLocaleString()}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>Rs. {total.toLocaleString()}</span>
        </div>

        {shippingCost > 0 && (
          <p className="text-xs text-muted-foreground">
            Add Rs. {(5000 - subtotal).toLocaleString()} more for free shipping
          </p>
        )}
      </CardContent>
    </Card>
  )
}
