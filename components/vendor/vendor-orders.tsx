"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderStatusStepper } from "@/components/orders/order-status-stepper"
import { advanceSuborderStatus } from "@/lib/actions/orders"
import { getValidSuborderTransitions } from "@/lib/order-transitions"
import { getStatusColor, formatStatus } from "@/lib/order-utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Truck, Clock, Package, CheckCircle2, AlertCircle } from "lucide-react"
import type { SuborderStatus } from "@/lib/types"

interface VendorOrdersProps {
  vendorId: string
}

interface SuborderRow {
  id: string
  status: SuborderStatus
  subtotal: number
  commission_amount: number
  delivery_charge: number
  estimated_delivery_time: string | null
  tracking_number: string | null
  created_at: string
  orders: {
    id: string
    created_at: string
    shipping_address: Record<string, unknown>
  } | null
  order_items: {
    id: string
    quantity: number
    price: number
    products: { id: string; name: string; image_url: string | null } | null
  }[]
}

const STATUS_TABS = [
  { value: "new", label: "New", statuses: ["pending"] as SuborderStatus[], icon: AlertCircle },
  { value: "processing", label: "Processing", statuses: ["accepted", "processing"] as SuborderStatus[], icon: Package },
  { value: "ready", label: "Ready", statuses: ["ready_for_delivery"] as SuborderStatus[], icon: Truck },
  { value: "transit", label: "In Transit", statuses: ["out_for_delivery"] as SuborderStatus[], icon: Truck },
  { value: "delivered", label: "Delivered", statuses: ["delivered"] as SuborderStatus[], icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] as SuborderStatus[], icon: AlertCircle },
]

export function VendorOrders({ vendorId }: VendorOrdersProps) {
  const [suborders, setSuborders] = useState<SuborderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("new")
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
          `id, status, subtotal, commission_amount, delivery_charge, estimated_delivery_time,
           tracking_number, created_at,
           orders ( id, created_at, shipping_address ),
           order_items ( id, quantity, price, products ( id, name, image_url ) )`,
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSuborders((data as unknown as SuborderRow[]) || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function advanceStatus(suborder: SuborderRow) {
    const transitions = getValidSuborderTransitions(suborder.status)
    if (transitions.length === 0) return

    const next = transitions[0]
    setUpdatingId(suborder.id)
    try {
      const tracking = trackingDrafts[suborder.id]?.trim() || undefined
      const result = await advanceSuborderStatus(suborder.id, next.status, undefined, tracking)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuborders((prev) =>
        prev.map((s) =>
          s.id === suborder.id
            ? { ...s, status: next.status, tracking_number: tracking || s.tracking_number }
            : s,
        ),
      )
      toast({ title: "Order updated", description: `Marked as ${formatStatus(next.status)}` })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  async function cancelOrder(suborderId: string) {
    if (!confirm("Cancel this order? This can't be undone.")) return

    setUpdatingId(suborderId)
    try {
      const result = await advanceSuborderStatus(suborderId, "cancelled", "Cancelled by seller")
      if (!result.success) throw new Error(result.error)

      setSuborders((prev) =>
        prev.map((s) => (s.id === suborderId ? { ...s, status: "cancelled" as SuborderStatus } : s)),
      )
      toast({ title: "Order cancelled" })
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel order",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Get count for each tab
  const getTabCount = (statuses: SuborderStatus[]) => {
    return suborders.filter((s) => statuses.includes(s.status)).length
  }

  // Filter suborders for current tab
  const currentTab = STATUS_TABS.find((t) => t.value === activeTab)
  const filteredSuborders = currentTab
    ? suborders.filter((s) => currentTab.statuses.includes(s.status))
    : suborders

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
        <CardDescription>Orders containing your products — accept, process, and track delivery</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            {STATUS_TABS.map((tab) => {
              const count = getTabCount(tab.statuses)
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="relative">
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4 mt-4">
              {filteredSuborders
                .filter((s) => tab.statuses.includes(s.status))
                .map((suborder) => {
                  const shipping = suborder.orders?.shipping_address as Record<string, unknown>
                  const transitions = getValidSuborderTransitions(suborder.status)
                  const canCancel = suborder.status === "pending" || suborder.status === "accepted" || suborder.status === "processing"

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
                          <Badge className={getStatusColor(suborder.status)}>
                            {formatStatus(suborder.status)}
                          </Badge>
                        </div>

                        <OrderStatusStepper status={suborder.status} isSuborder />

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
                            Ship to: {(shipping?.full_name as string) || ""}, {(shipping?.city as string) || ""}
                          </span>
                          <div className="text-right">
                            <span className="font-medium">
                              Subtotal: Rs. {suborder.subtotal.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              (You receive: Rs. {(suborder.subtotal - suborder.commission_amount).toLocaleString()})
                            </span>
                          </div>
                        </div>

                        {suborder.delivery_charge > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Delivery charge: Rs. {suborder.delivery_charge.toLocaleString()}
                          </p>
                        )}
                        {suborder.estimated_delivery_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Est. delivery: {suborder.estimated_delivery_time}
                          </p>
                        )}

                        {suborder.status === "ready_for_delivery" && (
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

                        {suborder.tracking_number && suborder.status !== "ready_for_delivery" && (
                          <p className="text-sm border-t pt-3">
                            <span className="text-muted-foreground">Tracking: </span>
                            <span className="font-medium">{suborder.tracking_number}</span>
                          </p>
                        )}

                        {(transitions.length > 0 || canCancel) && (
                          <div className="flex justify-end gap-2 border-t pt-3">
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelOrder(suborder.id)}
                                disabled={updatingId === suborder.id}
                              >
                                Cancel
                              </Button>
                            )}
                            {transitions.length > 0 && (
                              <Button
                                size="sm"
                                onClick={() => advanceStatus(suborder)}
                                disabled={updatingId === suborder.id}
                              >
                                {updatingId === suborder.id ? "Updating..." : transitions[0].label}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}

              {filteredSuborders.filter((s) => tab.statuses.includes(s.status)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No {tab.label.toLowerCase()} orders</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
