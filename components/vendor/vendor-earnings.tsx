"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { requestPayout } from "@/lib/actions/payouts"
import { useToast } from "@/hooks/use-toast"
import type { SellerWallet, Payout, FinancialLedgerEntry } from "@/lib/types"
import { Wallet, ArrowUpRight, ArrowDownRight, Loader2, HandCoins, Search } from "lucide-react"
import { format } from "date-fns"

interface VendorEarningsProps {
  vendorId: string
}

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString("en-NP")}`
}

function payoutBadge(status: Payout["status"]) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>
    case "processing":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "cancelled":
      return <Badge variant="secondary">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function VendorEarnings({ vendorId }: VendorEarningsProps) {
  const [wallet, setWallet] = useState<SellerWallet | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState("")
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [walletRes, payoutsRes, ledgerRes] = await Promise.all([
        supabase
          .from("seller_wallets")
          .select("*")
          .eq("vendor_id", vendorId)
          .single(),
        supabase
          .from("payouts")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("financial_ledger")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      if (walletRes.error && walletRes.error.code !== "PGRST116") throw walletRes.error
      if (payoutsRes.error) throw payoutsRes.error

      setWallet(walletRes.data as SellerWallet | null)
      setPayouts((payoutsRes.data as Payout[]) || [])
      setLedger((ledgerRes.data as FinancialLedgerEntry[]) || [])
    } catch (err) {
      console.error("Error fetching earnings:", err)
      toast({ title: "Error", description: "Failed to load earnings data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(payoutAmount)
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid payout amount.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await requestPayout(amount, payoutMethod)
      if (!result.success) {
        throw new Error(result.error)
      }
      toast({ title: "Payout requested", description: `Your payout request of ${formatRs(amount)} has been submitted.` })
      setDialogOpen(false)
      setPayoutAmount("")
      setPayoutMethod("bank_transfer")
      await fetchData()
    } catch (err) {
      console.error("Payout error:", err)
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to request payout.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings</CardTitle>
          <CardDescription>Your wallet and payout history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const balance = wallet?.balance ?? 0
  const totalEarned = wallet?.total_earned ?? 0
  const totalWithdrawn = wallet?.total_withdrawn ?? 0
  const commissionPaid = wallet?.total_commission_paid ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Earnings
            </CardTitle>
            <CardDescription>Your wallet and payout history</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <HandCoins className="h-4 w-4" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleRequestPayout}>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Available balance: {formatRs(balance)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="payout-amount">Amount (Rs.)</Label>
                    <Input
                      id="payout-amount"
                      type="number"
                      min="1"
                      max={balance}
                      step="1"
                      placeholder="Enter amount"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="esewa">eSewa</SelectItem>
                        <SelectItem value="khalti">Khalti</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className="text-xl font-semibold mt-1">{formatRs(balance)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              Total Earned
            </div>
            <p className="text-xl font-semibold mt-1 text-emerald-600">{formatRs(totalEarned)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              <ArrowDownRight className="h-3.5 w-3.5 text-blue-600" />
              Total Withdrawn
            </div>
            <p className="text-xl font-semibold mt-1">{formatRs(totalWithdrawn)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission Paid</p>
            <p className="text-xl font-semibold mt-1 text-muted-foreground">{formatRs(commissionPaid)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Payout History</h3>
          {payouts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <HandCoins className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payouts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Request a payout when you have available balance.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payout.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatRs(payout.amount)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {(payout.payment_method || "—").replace("_", " ")}
                      </TableCell>
                      <TableCell>{payoutBadge(payout.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Financial Ledger */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Transaction Ledger</h3>
            <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
                <SelectItem value="reversal">Reversals</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ledger.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger
                    .filter((e) => ledgerTypeFilter === "all" || e.type === ledgerTypeFilter)
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(entry.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
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
                            className="text-[10px] capitalize"
                          >
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {entry.description || "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium text-xs ${
                            entry.amount >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {entry.amount >= 0 ? "+" : ""}{formatRs(Math.abs(entry.amount))}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRs(entry.balance_after)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
