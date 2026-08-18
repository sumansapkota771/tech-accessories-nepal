import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Truck, Store } from "lucide-react"
import type { CartItem } from "@/lib/types"

interface CheckoutSummaryProps {
  items: CartItem[]
}

export function CheckoutSummary({ items }: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.products?.price || 0) * item.quantity
  }, 0)

  // Group by vendor
  const vendorGroups = new Map<string, { vendorName: string; items: CartItem[]; subtotal: number }>()

  for (const item of items) {
    const vendorId = item.products?.vendor_id || "unknown"
    const vendor = item.products?.vendors
    const vendorName = vendor && "store_name" in vendor
      ? (vendor as { store_name: string }).store_name
      : "Store"

    const existing = vendorGroups.get(vendorId)
    if (existing) {
      existing.items.push(item)
      existing.subtotal += (item.products?.price || 0) * item.quantity
    } else {
      vendorGroups.set(vendorId, {
        vendorName,
        items: [item],
        subtotal: (item.products?.price || 0) * item.quantity,
      })
    }
  }

  // Estimate per-vendor shipping
  let estimatedShipping = 0
  for (const [, group] of vendorGroups) {
    if (group.subtotal < 5000) {
      estimatedShipping += 150
    }
  }

  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + estimatedShipping + tax

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-vendor items */}
        {Array.from(vendorGroups.entries()).map(([vendorId, group]) => (
          <div key={vendorId} className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{group.vendorName}</span>
              <Badge variant="secondary" className="text-xs">
                {group.items.length} item{group.items.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="space-y-2 pl-5">
              {group.items.map((item) => {
                const product = item.products
                if (!product) return null

                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={product.image_url || "/placeholder.svg?height=40&width=40"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">Rs. {(product.price * item.quantity).toLocaleString()}</p>
                  </div>
                )
              })}
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Seller subtotal</span>
                <span>Rs. {group.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Shipping
                </span>
                <span>{group.subtotal >= 5000 ? "Free" : "Rs. 150"}</span>
              </div>
            </div>
            <Separator />
          </div>
        ))}

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              Shipping (estimated)
            </span>
            <span>
              {estimatedShipping === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                `Rs. ${estimatedShipping.toLocaleString()}`
              )}
            </span>
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

        {estimatedShipping > 0 && (
          <p className="text-xs text-muted-foreground">
            Final shipping calculated based on seller delivery settings
          </p>
        )}
      </CardContent>
    </Card>
  )
}
