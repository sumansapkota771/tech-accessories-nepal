"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { AuditLog } from "@/lib/types"
import {
  Shield,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import { format } from "date-fns"

const PAGE_SIZE = 30

const ACTION_LABELS: Record<string, string> = {
  "vendor.approved": "Vendor Approved",
  "vendor.rejected": "Vendor Rejected",
  "vendor.suspended": "Vendor Suspended",
  "vendor.document_verified": "Document Verified",
  "vendor.document_rejected": "Document Rejected",
  "product.approved": "Product Approved",
  "product.rejected": "Product Rejected",
  "product.deleted": "Product Deleted",
  "product.created": "Product Created",
  "product.updated": "Product Updated",
  "product.submitted_for_qc": "QC Submitted",
  "product.qc.approved": "QC Approved",
  "product.qc.rejected": "QC Rejected",
  "product.qc.changes_requested": "QC Changes Requested",
  "product.status_changed": "Product Status Changed",
  "category.created": "Category Created",
  "category.updated": "Category Updated",
  "category.deleted": "Category Deleted",
  "category.request_approved": "Category Request Approved",
  "category.request_rejected": "Category Request Rejected",
  "review.moderated": "Review Moderated",
  "review.report_resolved": "Report Resolved",
  "order.status_changed": "Order Status Changed",
  "order.cancelled": "Order Cancelled",
  "payout.approved": "Payout Approved",
  "payout.rejected": "Payout Rejected",
  "wallet.credited": "Wallet Credited",
  "wallet.debited": "Wallet Debited",
  "financial.reversal": "Financial Reversal",
  "admin.role_changed": "Admin Role Changed",
  "commission.changed": "Commission Changed",
}

function actionBadgeColor(action: string) {
  if (action.startsWith("vendor")) return "bg-blue-100 text-blue-700"
  if (action.startsWith("product")) return "bg-violet-100 text-violet-700"
  if (action.startsWith("order")) return "bg-cyan-100 text-cyan-700"
  if (action.startsWith("review")) return "bg-yellow-100 text-yellow-700"
  if (action.startsWith("wallet") || action.startsWith("financial") || action.startsWith("payout") || action.startsWith("commission")) return "bg-emerald-100 text-emerald-700"
  if (action.startsWith("category")) return "bg-orange-100 text-orange-700"
  if (action.startsWith("admin")) return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, entityFilter])

  async function fetchLogs() {
    setLoading(true)
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter)
      }
      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter)
      }

      const { data, error, count } = await query

      if (error) throw error
      setLogs((data as AuditLog[]) || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error("Error fetching audit logs:", err)
      toast({ title: "Error", description: "Failed to load audit logs.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredBySearch = useMemo(() => {
    if (!searchTerm) return logs
    const term = searchTerm.toLowerCase()
    return logs.filter(
      (l) =>
        l.actor_email?.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term) ||
        l.entity_type.toLowerCase().includes(term) ||
        l.entity_id?.toLowerCase().includes(term),
    )
  }, [logs, searchTerm])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>()
    logs.forEach((l) => actions.add(l.action))
    return Array.from(actions).sort()
  }, [logs])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Complete record of all platform actions ({totalCount.toLocaleString()} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by actor, action, entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="payout">Payout</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No audit logs found.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBySearch.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "MMM dd, HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">{log.actor_email || "System"}</p>
                          {log.actor_role && (
                            <p className="text-[10px] text-muted-foreground capitalize">{log.actor_role}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${actionBadgeColor(log.action)}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">{log.entity_type}</span>
                          {log.entity_id && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                              {log.entity_id.slice(0, 8)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDetailLog(log)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>
              {detailLog && format(new Date(detailLog.created_at), "MMMM dd, yyyy 'at' HH:mm:ss")}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Actor</p>
                  <p className="font-medium">{detailLog.actor_email || "System"}</p>
                  {detailLog.actor_role && (
                    <p className="text-xs text-muted-foreground capitalize">{detailLog.actor_role}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <Badge className={`text-[10px] ${actionBadgeColor(detailLog.action)}`}>
                    {ACTION_LABELS[detailLog.action] || detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entity Type</p>
                  <p className="capitalize">{detailLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-xs break-all">{detailLog.entity_id || "—"}</p>
                </div>
              </div>
              {detailLog.old_value && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Previous State</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(detailLog.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.new_value && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">New State</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(detailLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.metadata && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(detailLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.ip_address && (
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-mono text-xs">{detailLog.ip_address}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
