"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingBag, Tag } from "lucide-react"
import { useRouter } from "next/navigation"
import type { CartItem } from "@/lib/types"

interface CartSummaryProps {
  items: CartItem[]
}

export function CartSummary({ items }: CartSummaryProps) {
  const [promoCode, setPromoCode] = useState("")
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const router = useRouter()

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.products?.price || 0) * item.quantity
  }, 0)

  const shippingCost = subtotal >= 5000 ? 0 : 150 // Free shipping above Rs. 5000
  const tax = Math.round(subtotal * 0.13) // 13% VAT
  const total = subtotal + shippingCost + tax

  const handleApplyPromo = async () => {
    setIsApplyingPromo(true)
    // Simulate API call
    setTimeout(() => {
      setIsApplyingPromo(false)
      // For demo purposes, show invalid promo
      if (promoCode.toLowerCase() !== "welcome10") {
        alert("Invalid promo code")
      } else {
        alert("Promo code applied! 10% discount")
      }
    }, 1000)
  }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Promo Code */}
        <div className="space-y-2">
          <Label htmlFor="promo-code" className="text-sm font-medium">
            Promo Code
          </Label>
          <div className="flex gap-2">
            <Input
              id="promo-code"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
            <Button variant="outline" onClick={handleApplyPromo} disabled={isApplyingPromo || !promoCode.trim()}>
              <Tag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({items.length} items)</span>
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

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>Rs. {total.toLocaleString()}</span>
        </div>

        {shippingCost > 0 && (
          <p className="text-xs text-muted-foreground">
            Add Rs. {(5000 - subtotal).toLocaleString()} more for free shipping
          </p>
        )}

        <Button onClick={handleCheckout} className="w-full" size="lg">
          Proceed to Checkout
        </Button>

        {/* Security Badge */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">🔒 Secure checkout with SSL encryption</p>
        </div>
      </CardContent>
    </Card>
  )
}
