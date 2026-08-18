"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingBag, Tag, CheckCircle2, XCircle, Truck, Store } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { CartItem } from "@/lib/types"

interface CartSummaryProps {
  items: CartItem[]
}

export function CartSummary({ items }: CartSummaryProps) {
  const [promoCode, setPromoCode] = useState("")
  const [promoStatus, setPromoStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [discount, setDiscount] = useState(0)
  const [promoMessage, setPromoMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.products?.price || 0) * item.quantity
  }, 0)

  // Group by vendor to estimate per-seller shipping
  const vendorGroups = new Map<string, number>()
  for (const item of items) {
    const vendorId = item.products?.vendor_id || "unknown"
    const vendorSubtotal = vendorGroups.get(vendorId) || 0
    vendorGroups.set(vendorId, vendorSubtotal + (item.products?.price || 0) * item.quantity)
  }

  // Estimate shipping: each vendor charges independently
  let estimatedShipping = 0
  for (const [, vendorSubtotal] of vendorGroups) {
    // Platform default: free above Rs. 5000 per vendor, else Rs. 150
    // Note: actual shipping is calculated server-side using vendor delivery settings
    if (vendorSubtotal < 5000) {
      estimatedShipping += 150
    }
  }

  const tax = Math.round(subtotal * 0.13)
  const discountAmount = Math.round(subtotal * discount)
  const total = subtotal - discountAmount + estimatedShipping + tax

  const handleApplyPromo = async () => {
    setPromoStatus("loading")
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      })
      const data = await res.json()

      if (data.valid) {
        setDiscount(data.discount_rate)
        setPromoStatus("success")
        setPromoMessage(`${Math.round(data.discount_rate * 100)}% discount applied`)
        toast({
          title: "Promo code applied",
          description: `${Math.round(data.discount_rate * 100)}% discount will be applied at checkout.`,
        })
      } else {
        setPromoStatus("error")
        setDiscount(0)
        setPromoMessage(data.error || "Invalid promo code")
      }
    } catch {
      setPromoStatus("error")
      setDiscount(0)
      setPromoMessage("Failed to validate promo code")
    }
  }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  const sellerCount = vendorGroups.size

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seller info */}
        {sellerCount > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Store className="h-4 w-4" />
            <span>
              Items from {sellerCount} different sellers — shipping calculated separately per seller
            </span>
          </div>
        )}

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
              onChange={(e) => {
                setPromoCode(e.target.value)
                if (promoStatus !== "idle") {
                  setPromoStatus("idle")
                  setDiscount(0)
                  setPromoMessage("")
                }
              }}
              disabled={promoStatus === "success"}
            />
            {promoStatus === "success" ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPromoStatus("idle")
                  setPromoCode("")
                  setDiscount(0)
                  setPromoMessage("")
                }}
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleApplyPromo}
                disabled={promoStatus === "loading" || !promoCode.trim()}
              >
                <Tag className="h-4 w-4" />
              </Button>
            )}
          </div>
          {promoMessage && (
            <p
              className={`text-xs flex items-center gap-1 ${
                promoStatus === "success" ? "text-green-600" : "text-destructive"
              }`}
            >
              {promoStatus === "success" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {promoMessage}
            </p>
          )}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({items.length} items)</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Promo discount</span>
              <span>- Rs. {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              Shipping
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
            Final shipping calculated at checkout based on seller locations
          </p>
        )}

        <Button onClick={handleCheckout} className="w-full" size="lg">
          Proceed to Checkout
        </Button>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">Secure checkout with SSL encryption</p>
        </div>
      </CardContent>
    </Card>
  )
}
