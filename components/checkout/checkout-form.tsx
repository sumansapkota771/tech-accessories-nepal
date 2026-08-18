"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { CreditCard, Truck, MapPin, Clock, Store } from "lucide-react"
import { placeOrder } from "@/lib/actions/checkout"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { CartItem } from "@/lib/types"

interface CheckoutFormProps {
  user: User
  items: CartItem[]
}

export function CheckoutForm({ user, items }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [deliveryMethod, setDeliveryMethod] = useState("standard")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "Kathmandu",
    postalCode: "",
    notes: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // Group items by vendor for display
  const vendorGroups = new Map<string, { vendorName: string; itemCount: number }>()
  for (const item of items) {
    const vendor = item.products?.vendors
    if (vendor && "store_name" in vendor) {
      const vendorId = item.products?.vendor_id || "unknown"
      const existing = vendorGroups.get(vendorId)
      if (existing) {
        existing.itemCount += item.quantity
      } else {
        vendorGroups.set(vendorId, {
          vendorName: (vendor as { store_name: string }).store_name,
          itemCount: item.quantity,
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      toast({
        title: "Terms required",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await placeOrder(formData, paymentMethod, deliveryMethod, formData.notes)

      if (!result.success || !result.orderId) {
        throw new Error(result.error || "Failed to place order")
      }

      toast({
        title: "Order placed successfully!",
        description: "You will receive a confirmation shortly.",
      })

      router.push(`/orders/${result.orderId}`)
    } catch (error) {
      console.error("Checkout error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seller Info */}
      {vendorGroups.size > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              <span>
                Your order includes items from {vendorGroups.size} sellers.
                Each seller ships separately with their own delivery timeline.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Street address, building, apartment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Special instructions for delivery"
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Standard Delivery</p>
                    <p className="text-sm text-muted-foreground">3-5 business days</p>
                  </div>
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="express" id="express" />
              <Label htmlFor="express" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Express Delivery</p>
                    <p className="text-sm text-muted-foreground">1-2 business days (+Rs. 250 per seller)</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="self_pickup" id="self_pickup" />
              <Label htmlFor="self_pickup" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Self Pickup</p>
                    <p className="text-sm text-muted-foreground">Pick up from seller locations (free)</p>
                  </div>
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                  </div>
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg opacity-50">
              <RadioGroupItem value="online" id="online" disabled />
              <Label htmlFor="online" className="flex-1 cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Online Payment</p>
                    <p className="text-sm text-muted-foreground">Coming soon - eSewa, Khalti, Bank Transfer</p>
                  </div>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
              I agree to the{" "}
              <a href="/about" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                terms and conditions
              </a>{" "}
              and confirm that the shipping information is correct. I understand that each seller may have different
              delivery timelines.
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading || !termsAccepted}>
        {isLoading ? "Placing Order..." : "Place Order"}
      </Button>
    </form>
  )
}
