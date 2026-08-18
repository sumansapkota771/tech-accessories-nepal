"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  Users,
  Store,
  Clock,
  Package,
  ClipboardCheck,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Wallet,
  Star,
  Flag,
  Loader2,
  RefreshCw,
} from "lucide-react"

interface DashboardStats {
  totalBuyers: number
  activeSellers: number
  pendingSellers: number
  totalProducts: number
  pendingQc: number
  totalOrders: number
  revenue: number
  gmv: number
  platformFees: number
  pendingPayouts: number
  totalReviews: number
  pendingReports: number
}

function formatRs(amount: number) {
  if (amount >= 10000000) return `Rs. ${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(1)}L`
  return `Rs. ${amount.toLocaleString("en-NP")}`
}

export function AdminStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const [
        buyersResult,
        vendorsResult,
        pendingVendorsResult,
        productsResult,
        pendingQcResult,
        ordersResult,
        subordersResult,
        payoutsResult,
        reviewsResult,
        reportsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "user"),
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .eq("is_deleted", false),
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "under_review"]),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_deleted", false),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("product_status", "pending")
          .eq("is_deleted", false),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("suborders")
          .select("subtotal, commission_amount, delivery_charge"),
        supabase
          .from("payouts")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "approved"]),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("review_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ])

      const suborders = subordersResult.data || []
      const revenue = suborders.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0)
      const platformFees = suborders.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0)
      const gmv = revenue + platformFees + suborders.reduce((sum, s) => sum + (Number(s.delivery_charge) || 0), 0)

      setStats({
        totalBuyers: buyersResult.count || 0,
        activeSellers: vendorsResult.count || 0,
        pendingSellers: pendingVendorsResult.count || 0,
        totalProducts: productsResult.count || 0,
        pendingQc: pendingQcResult.count || 0,
        totalOrders: ordersResult.count || 0,
        revenue,
        gmv,
        platformFees,
        pendingPayouts: payoutsResult.count || 0,
        totalReviews: reviewsResult.count || 0,
        pendingReports: reportsResult.count || 0,
      })
    } catch (err) {
      console.error("Failed to fetch stats:", err)
      setError("Failed to load dashboard stats")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <button
            onClick={fetchStats}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const metrics = [
    {
      label: "Total Buyers",
      value: stats.totalBuyers.toLocaleString(),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Active Sellers",
      value: stats.activeSellers.toLocaleString(),
      icon: Store,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Pending Sellers",
      value: stats.pendingSellers.toLocaleString(),
      icon: Clock,
      color: stats.pendingSellers > 0 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground",
      badge: stats.pendingSellers > 0 ? "action" : undefined,
    },
    {
      label: "Products",
      value: stats.totalProducts.toLocaleString(),
      icon: Package,
      color: "bg-violet-100 text-violet-600",
    },
    {
      label: "Pending QC",
      value: stats.pendingQc.toLocaleString(),
      icon: ClipboardCheck,
      color: stats.pendingQc > 0 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground",
      badge: stats.pendingQc > 0 ? "action" : undefined,
    },
    {
      label: "Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: "bg-cyan-100 text-cyan-600",
    },
    {
      label: "Revenue",
      value: formatRs(stats.revenue),
      icon: TrendingUp,
      color: "bg-emerald-100 text-emerald-600",
      isHero: true,
    },
    {
      label: "GMV",
      value: formatRs(stats.gmv),
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      isHero: true,
    },
    {
      label: "Platform Fees",
      value: formatRs(stats.platformFees),
      icon: Wallet,
      color: "bg-blue-100 text-blue-600",
      isHero: true,
    },
    {
      label: "Pending Payouts",
      value: stats.pendingPayouts.toLocaleString(),
      icon: DollarSign,
      color: stats.pendingPayouts > 0 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground",
      badge: stats.pendingPayouts > 0 ? "action" : undefined,
    },
    {
      label: "Reviews",
      value: stats.totalReviews.toLocaleString(),
      icon: Star,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      label: "Pending Reports",
      value: stats.pendingReports.toLocaleString(),
      icon: Flag,
      color: stats.pendingReports > 0 ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground",
      badge: stats.pendingReports > 0 ? "action" : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Real-time platform metrics
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold truncate">{m.value}</p>
                </div>
                {m.badge && (
                  <Badge className="bg-orange-100 text-orange-700 text-[10px] shrink-0">
                    Needs attention
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
