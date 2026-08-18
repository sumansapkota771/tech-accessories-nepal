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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { reviewPayout } from "@/lib/actions/payouts"
import { useToast } from "@/hooks/use-toast"
import type { FinancialLedgerEntry, Payout, Vendor } from "@/lib/types"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { format } from "date-fns"

interface FinanceSummary {
  totalSales: number
  totalCommissions: number
  totalPayouts: number
  pendingPayouts: number
  pendingPayoutCount: number
}

interface VendorWithWallet extends Vendor {
  seller_wallets?: { balance: number; total_earned: number; total_withdrawn: number }
}

export function AdminFinance() {
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([])
  const [payouts, setPayouts] = useState<(Payout & { vendors?: VendorWithWallet })[]>([])
  const [vendors, setVendors] = useState<VendorWithWallet[]>([])
  const [summary, setSummary] = useState<FinanceSummary>({
    totalSales: 0,
    totalCommissions: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    pendingPayoutCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [ledgerRes, payoutsRes, vendorsRes] = await Promise.all([
        supabase
          .from("financial_ledger")
          .select("*, vendors(store_name)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("payouts")
          .select("*, vendors(user_id, store_name, seller_wallets(balance))")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("vendors")
          .select("*, seller_wallets(balance, total_earned, total_withdrawn)")
          .eq("status", "approved")
          .order("store_name"),
      ])

      if (ledgerRes.error) throw ledgerRes.error

      const ledgerData = (ledgerRes.data || []) as unknown as (FinancialLedgerEntry & {
        vendors?: { store_name: string }
      })[]
      setLedger(ledgerData)

      setPayouts((payoutsRes.data || []) as (Payout & { vendors?: VendorWithWallet })[])

      setVendors((vendorsRes.data || []) as VendorWithWallet[])

      // Calculate summary from ledger
      let totalSales = 0
      let totalCommissions = 0
      let totalPayouts = 0
      let pendingPayouts = 0
      let pendingPayoutCount = 0

      for (const entry of ledgerData) {
        if (entry.type === "sale") totalSales += entry.amount
        if (entry.type === "commission") totalCommissions += Math.abs(entry.amount)
      }

      for (const payout of payoutsRes.data || []) {
        if (payout.status === "completed") totalPayouts += payout.amount
        if (payout.status === "pending" || payout.status === "approved") {
          pendingPayouts += payout.amount
          pendingPayoutCount++
        }
      }

      setSummary({ totalSales, totalCommissions, totalPayouts, pendingPayouts, pendingPayoutCount })
    } catch (err) {
      console.error("Error fetching finance data:", err)
      toast({ title: "Error", description: "Failed to load finance data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handlePayoutAction(payoutId: string, action: "approved" | "completed" | "failed" | "cancelled") {
    setProcessingPayoutId(payoutId)
    try {
      const result = await reviewPayout(payoutId, action)
      if (!result.success) throw new Error(result.error)

      toast({ title: "Payout updated", description: `Payout ${action}.` })
      await fetchData()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Action failed.", variant: "destructive" })
    } finally {
      setProcessingPayoutId(null)
    }
  }

  const filteredLedger = useMemo(() => {
    return ledger.filter((entry) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (
          entry.description?.toLowerCase().includes(term) ||
          entry.type.toLowerCase().includes(term)
        ) {
          return true
        }
        return false
      }
      if (typeFilter !== "all" && entry.type !== typeFilter) return false
      return true
    })
  }, [ledger, searchTerm, typeFilter])

  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "approved")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Finance</CardTitle>
          <CardDescription>Loading finance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-lg font-semibold">Rs. {summary.totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions Earned</p>
                <p className="text-lg font-semibold">Rs. {summary.totalCommissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <ArrowUpRight className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Payouts</p>
                <p className="text-lg font-semibold">Rs. {summary.totalPayouts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Payouts</p>
                <p className="text-lg font-semibold">
                  Rs. {summary.pendingPayouts.toLocaleString()}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({summary.pendingPayoutCount})
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payout Requests */}
      {pendingPayouts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <Clock className="h-4 w-4" />
              Pending Payout Requests ({pendingPayouts.length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              Approve or reject vendor payout requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payout.vendors?.store_name || "Vendor"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rs. {payout.amount.toLocaleString()} &middot; {payout.payment_method || "N/A"} &middot;{" "}
                      {format(new Date(payout.created_at), "MMM dd, yyyy")}
                    </p>
                    {payout.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">Note: {payout.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {processingPayoutId === payout.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handlePayoutAction(payout.id, "completed")}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve & Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handlePayoutAction(payout.id, "cancelled")}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Wallet Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Vendor Wallets
          </CardTitle>
          <CardDescription>Current wallet balances for approved vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No approved vendors.</p>
            ) : (
              vendors.map((v) => {
                const wallet = v.seller_wallets
                return (
                  <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{v.store_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Earned: Rs. {(wallet?.total_earned || 0).toLocaleString()} &middot; Withdrawn: Rs.{" "}
                        {(wallet?.total_withdrawn || 0).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      Rs. {(wallet?.balance || 0).toLocaleString()}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Ledger
          </CardTitle>
          <CardDescription>Immutable record of all financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
                <SelectItem value="reversal">Reversals</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Showing {filteredLedger.length} of {ledger.length} transactions
          </p>

          <div className="space-y-2">
            {filteredLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions found.
              </p>
            ) : (
              filteredLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          entry.type === "sale"
                            ? "default"
                            : entry.type === "commission"
                              ? "secondary"
                              : entry.type === "reversal"
                                ? "destructive"
                                : "outline"
                        }
                        className="text-[10px]"
                      >
                        {entry.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.description || "No description"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(entry.created_at), "MMM dd, yyyy 'at' HH:mm")} &middot; Balance after: Rs.{" "}
                      {entry.balance_after.toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold shrink-0 ${
                      entry.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {entry.amount >= 0 ? "+" : ""}Rs. {Math.abs(entry.amount).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
