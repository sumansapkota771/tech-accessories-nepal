"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/stat-card"
import { createBrowserClient } from "@/lib/supabase/client"
import { Package, ShoppingCart, DollarSign, Clock } from "lucide-react"

interface VendorStatsProps {
  vendorId: string
}

interface Stats {
  totalProducts: number
  totalOrders: number
  netRevenue: number
  pendingOrders: number
}

export function VendorStats({ vendorId }: VendorStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", vendorId)

        const { data: suborders, count: ordersCount } = await supabase
          .from("suborders")
          .select("subtotal, commission_amount, status", { count: "exact" })
          .eq("vendor_id", vendorId)

        const netRevenue =
          suborders?.reduce((sum, s) => sum + (s.subtotal - s.commission_amount), 0) || 0
        const pendingOrders = suborders?.filter((s) => s.status === "pending").length || 0

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersCount || 0,
          netRevenue,
          pendingOrders,
        })
      } catch (error) {
        console.error("Error fetching vendor stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase, vendorId])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const heroCards = [
    {
      title: "Net Revenue",
      value: `Rs. ${stats.netRevenue.toLocaleString()}`,
      description: "Your earnings after commission",
      icon: DollarSign,
      gradient: "primary" as const,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      description: "Orders containing your products",
      icon: ShoppingCart,
      gradient: "secondary" as const,
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      description: "Awaiting confirmation",
      icon: Clock,
      gradient: "alert" as const,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {heroCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            gradient={stat.gradient}
            icon={<stat.icon className="h-4 w-4" />}
          />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value={stats.totalProducts} icon={<Package className="h-4 w-4" />} />
      </div>
    </div>
  )
}
