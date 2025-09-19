"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown } from "lucide-react"

interface Stats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
  totalRevenue: number
  recentOrders: number
  pendingOrders: number
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

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersCount || 0,
          totalUsers: usersCount || 0,
          totalRevenue,
          recentOrders: recentOrdersCount || 0,
          pendingOrders: pendingOrdersCount || 0,
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

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      description: "Active products in store",
      icon: Package,
      trend: null,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      description: "All time orders",
      icon: ShoppingCart,
      trend: null,
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered customers",
      icon: Users,
      trend: null,
    },
    {
      title: "Total Revenue",
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`,
      description: "All time revenue",
      icon: DollarSign,
      trend: null,
    },
    {
      title: "Recent Orders",
      value: stats.recentOrders,
      description: "Orders in last 7 days",
      icon: TrendingUp,
      trend: "up",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      description: "Orders awaiting processing",
      icon: TrendingDown,
      trend: stats.pendingOrders > 0 ? "down" : null,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
