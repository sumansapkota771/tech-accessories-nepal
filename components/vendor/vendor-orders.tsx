"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OrderStatusStepper } from "@/components/orders/order-status-stepper"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Truck } from "lucide-react"

interface VendorOrdersProps {
  vendorId: string
}

type SuborderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

interface SuborderRow {
  id: string
  status: SuborderStatus
  subtotal: number
  commission_amount: number
  tracking_number: string | null
  created_at: string
  orders: {
    id: string
    created_at: string
    shipping_address: any
  } | null
  order_items: {
    id: string
    quantity: number
    price: number
    products: { id: string; name: string; image_url: string | null } | null
  }[]
}

const NEXT_STATUS: Partial<Record<SuborderStatus, { status: SuborderStatus; label: string }>> = {
  pending: { status: "confirmed", label: "Confirm Order" },
  confirmed: { status: "shipped", label: "Mark as Shipped" },
  shipped: { status: "delivered", label: "Mark as Delivered" },
}

export function VendorOrders({ vendorId }: VendorOrdersProps) {
  const [suborders, setSuborders] = useState<SuborderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchSuborders()
  }, [])

  async function fetchSuborders() {
    try {
      const { data, error } = await supabase
        .from("suborders")
        .select(
          `id, status, subtotal, commission_amount, tracking_number, created_at,
           orders ( id, created_at, shipping_address ),
           order_items ( id, quantity, price, products ( id, name, image_url ) )`,
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSuborders((data as any) || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function advanceStatus(suborder: SuborderRow) {
    const next = NEXT_STATUS[suborder.status]
    if (!next) return

    setUpdatingId(suborder.id)
    try {
      const updates: { status: SuborderStatus; tracking_number?: string } = { status: next.status }
      if (next.status === "shipped") {
        const draft = trackingDrafts[suborder.id]?.trim()
        if (draft) updates.tracking_number = draft
      }

      const { error } = await supabase.from("suborders").update(updates).eq("id", suborder.id)
      if (error) throw error

      setSuborders((prev) =>
        prev.map((s) => (s.id === suborder.id ? { ...s, ...updates } : s)),
      )
      toast({ title: "Order updated", description: `Marked as ${next.status}` })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" })
    } finally {
      setUpdatingId(null)
    }
  }

  async function cancelOrder(suborderId: string) {
    if (!confirm("Cancel this order? This can't be undone.")) return

    setUpdatingId(suborderId)
    try {
      const { error } = await supabase.from("suborders").update({ status: "cancelled" }).eq("id", suborderId)
      if (error) throw error

      setSuborders((prev) => prev.map((s) => (s.id === suborderId ? { ...s, status: "cancelled" } : s)))
      toast({ title: "Order cancelled" })
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({ title: "Error", description: "Failed to cancel order", variant: "destructive" })
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Orders containing your products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>Orders containing your products — confirm, ship, and track delivery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suborders.map((suborder) => {
          const shipping = suborder.orders?.shipping_address as any
          const next = NEXT_STATUS[suborder.status]
          const canCancel = suborder.status === "pending" || suborder.status === "confirmed"

          return (
            <Card key={suborder.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #{suborder.orders?.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {suborder.orders?.created_at
                        ? format(new Date(suborder.orders.created_at), "MMM dd, yyyy")
                        : ""}
                    </p>
                  </div>
                  {suborder.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
                </div>

                <OrderStatusStepper status={suborder.status} />

                <div className="space-y-2">
                  {suborder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      <img
                        src={item.products?.image_url || "/placeholder.svg?height=32&width=32"}
                        alt={item.products?.name || "Product"}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <span className="flex-1">{item.products?.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} x Rs. {item.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">
                    Ship to: {shipping?.full_name}, {shipping?.city}
                  </span>
                  <span className="font-medium">
                    Subtotal: Rs. {suborder.subtotal.toLocaleString()} (you receive Rs.{" "}
                    {(suborder.subtotal - suborder.commission_amount).toLocaleString()})
                  </span>
                </div>

                {suborder.status === "confirmed" && (
                  <div className="space-y-1.5 border-t pt-3">
                    <Label htmlFor={`tracking-${suborder.id}`} className="text-xs flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Tracking number (optional)
                    </Label>
                    <Input
                      id={`tracking-${suborder.id}`}
                      placeholder="e.g. courier waybill number"
                      value={trackingDrafts[suborder.id] ?? ""}
                      onChange={(e) => setTrackingDrafts((prev) => ({ ...prev, [suborder.id]: e.target.value }))}
                    />
                  </div>
                )}

                {suborder.tracking_number && suborder.status !== "confirmed" && (
                  <p className="text-sm border-t pt-3">
                    <span className="text-muted-foreground">Tracking number: </span>
                    <span className="font-medium">{suborder.tracking_number}</span>
                  </p>
                )}

                {(next || canCancel) && (
                  <div className="flex justify-end gap-2 border-t pt-3">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelOrder(suborder.id)}
                        disabled={updatingId === suborder.id}
                      >
                        Cancel Order
                      </Button>
                    )}
                    {next && (
                      <Button size="sm" onClick={() => advanceStatus(suborder)} disabled={updatingId === suborder.id}>
                        {updatingId === suborder.id ? "Updating..." : next.label}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {suborders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
