"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, Truck, MapPin } from "lucide-react"
import { placeOrder } from "@/lib/actions/checkout"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface CheckoutFormProps {
  user: User
}

export function CheckoutForm({ user }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cod")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await placeOrder(formData, paymentMethod)

      if (!result.success || !result.orderId) {
        throw new Error(result.error || "Failed to place order")
      }

      toast({
        title: "Order placed successfully!",
        description: "You will receive a confirmation email shortly.",
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

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Placing Order..." : "Place Order"}
      </Button>
    </form>
  )
}
