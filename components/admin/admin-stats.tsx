"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/stat-card"
import { createBrowserClient } from "@/lib/supabase/client"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBoxOpen,
  faCartShopping,
  faUsers,
  faSackDollar,
  faArrowTrendUp,
  faStore,
  faClock,
} from "@fortawesome/free-solid-svg-icons"

interface Stats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
  totalRevenue: number
  recentOrders: number
  pendingOrders: number
  totalVendors: number
  pendingVendors: number
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch products count
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true })

        // Fetch orders count and revenue
        const { data: orders, count: ordersCount } = await supabase
          .from("orders")
          .select("total_amount", { count: "exact" })

        // Fetch users count
        const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

        // Calculate total revenue
        const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

        // Fetch recent orders (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { count: recentOrdersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString())

        // Fetch pending orders
        const { count: pendingOrdersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")

        // Fetch vendor counts
        const { count: totalVendorsCount } = await supabase
          .from("vendors")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved")

        const { count: pendingVendorsCount } = await supabase
          .from("vendors")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersCount || 0,
          totalUsers: usersCount || 0,
          totalRevenue,
          recentOrders: recentOrdersCount || 0,
          pendingOrders: pendingOrdersCount || 0,
          totalVendors: totalVendorsCount || 0,
          pendingVendors: pendingVendorsCount || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const heroCards = [
    {
      title: "Total Revenue",
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`,
      description: "All time revenue",
      icon: faSackDollar,
      gradient: "primary" as const,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      description: "All time orders",
      icon: faCartShopping,
      gradient: "secondary" as const,
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      description: "Orders awaiting processing",
      icon: faClock,
      gradient: "alert" as const,
    },
  ]

  const plainCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      description: "Active products in store",
      icon: faBoxOpen,
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered customers",
      icon: faUsers,
    },
    {
      title: "Recent Orders",
      value: stats.recentOrders,
      description: "Orders in last 7 days",
      icon: faArrowTrendUp,
    },
    {
      title: "Active Vendors",
      value: stats.totalVendors,
      description: "Approved stores selling on the platform",
      icon: faStore,
    },
    {
      title: "Pending Vendor Applications",
      value: stats.pendingVendors,
      description: "Seller applications awaiting review",
      icon: faClock,
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
            icon={<FontAwesomeIcon icon={stat.icon} className="h-4 w-4" />}
          />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plainCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={<FontAwesomeIcon icon={stat.icon} className="h-4 w-4" />}
          />
        ))}
      </div>
    </div>
  )
}
