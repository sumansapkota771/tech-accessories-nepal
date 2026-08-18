"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { advanceMasterOrderStatus } from "@/lib/actions/orders"
import { getValidMasterTransitions } from "@/lib/order-transitions"
import { getStatusColor, formatStatus } from "@/lib/order-utils"
import type { Order, OrderStatus } from "@/lib/types"
import { Search, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

const PAGE_SIZE = 25
const ALL_MASTER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "processing", "partially_shipped",
  "shipped", "partially_delivered", "delivered", "completed", "cancelled",
]

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ orderId: string; newStatus: OrderStatus } | null>(null)
  const [page, setPage] = useState(0)

  const supabase = createBrowserClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles (id, full_name, email),
          suborders (id, status, vendors (store_name))
        `)
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) throw error
      setOrders(data || [])
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId)
    setConfirmDialog(null)
    try {
      const result = await advanceMasterOrderStatus(orderId, newStatus)
      if (!result.success) throw new Error(result.error)

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      )
      toast({ title: "Order updated", description: `Status changed to ${formatStatus(newStatus)}` })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE)
  const paginatedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Loading orders...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Manage customer orders across all vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, customer name, or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ALL_MASTER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Showing {paginatedOrders.length} of {filteredOrders.length} orders
          </p>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendors</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => {
                    const validTransitions = getValidMasterTransitions(order.status)
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">#{order.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{order.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(order.suborders || []).map((sub: { id: string; status: string; vendors?: { store_name: string } }) => (
                              <Badge key={sub.id} variant="outline" className="text-[10px]">
                                {sub.vendors?.store_name || "Store"}: {sub.status.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          Rs. {order.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {validTransitions.length > 0 ? (
                            <Select
                              value={order.status}
                              onValueChange={(value) => setConfirmDialog({ orderId: order.id, newStatus: value as OrderStatus })}
                              disabled={updatingId === order.id}
                            >
                              <SelectTrigger className="w-[130px]">
                                <Badge className={getStatusColor(order.status)}>
                                  {updatingId === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  {formatStatus(order.status)}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={order.status}>{formatStatus(order.status)}</SelectItem>
                                {validTransitions.map((t) => (
                                  <SelectItem key={t.status} value={t.status}>→ {t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getStatusColor(order.status)}>{formatStatus(order.status)}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => router.push(`/orders/${order.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Change order #{confirmDialog?.orderId.substring(0, 8)} to{" "}
              <strong>{confirmDialog && formatStatus(confirmDialog.newStatus)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              onClick={() => confirmDialog && updateOrderStatus(confirmDialog.orderId, confirmDialog.newStatus)}
              disabled={!!updatingId}
            >
              {updatingId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
