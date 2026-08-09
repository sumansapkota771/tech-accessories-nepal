"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { createBrowserClient } from "@/lib/supabase/client"

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenue (Rs.)", color: "var(--chart-1)" },
}

const countConfig: ChartConfig = {
  count: { label: "Orders", color: "var(--chart-1)" },
}

const amountConfig: ChartConfig = {
  amount: { label: "Revenue (Rs.)", color: "var(--chart-1)" },
}

interface RevenuePoint {
  date: string
  revenue: number
}

interface StatusPoint {
  status: string
  count: number
}

interface RankedEntry {
  name: string
  amount: number
}

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([])
  const [statusSeries, setStatusSeries] = useState<StatusPoint[]>([])
  const [topVendors, setTopVendors] = useState<RankedEntry[]>([])
  const [topProducts, setTopProducts] = useState<RankedEntry[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const [ordersRes, suborderRes, itemsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("created_at, total_amount, status")
            .gte("created_at", thirtyDaysAgo.toISOString()),
          supabase.from("suborders").select("subtotal, vendors ( store_name )"),
          supabase.from("order_items").select("price, quantity, products ( name )"),
        ])

        // Revenue over the last 30 days, one bucket per day
        const byDay = new Map<string, number>()
        for (let i = 0; i < 30; i++) {
          const d = new Date(thirtyDaysAgo)
          d.setDate(d.getDate() + i)
          byDay.set(d.toISOString().slice(0, 10), 0)
        }
        for (const order of ordersRes.data || []) {
          const key = order.created_at?.slice(0, 10)
          if (key && byDay.has(key)) {
            byDay.set(key, (byDay.get(key) || 0) + (order.total_amount || 0))
          }
        }
        setRevenueSeries(
          Array.from(byDay.entries()).map(([date, revenue]) => ({
            date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            revenue,
          })),
        )

        // Orders by status (last 30 days)
        const statusOrder = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        const statusCounts = new Map(statusOrder.map((s) => [s, 0]))
        for (const order of ordersRes.data || []) {
          if (statusCounts.has(order.status)) {
            statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1)
          }
        }
        setStatusSeries(
          statusOrder.map((status) => ({
            status: status.charAt(0).toUpperCase() + status.slice(1),
            count: statusCounts.get(status) || 0,
          })),
        )

        // Top vendors by gross revenue
        const vendorTotals = new Map<string, number>()
        for (const row of (suborderRes.data as any[]) || []) {
          const name = row.vendors?.store_name || "Unknown store"
          vendorTotals.set(name, (vendorTotals.get(name) || 0) + (row.subtotal || 0))
        }
        setTopVendors(
          Array.from(vendorTotals.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5),
        )

        // Top products by gross revenue
        const productTotals = new Map<string, number>()
        for (const row of (itemsRes.data as any[]) || []) {
          const name = row.products?.name || "Unknown product"
          productTotals.set(name, (productTotals.get(name) || 0) + (row.price || 0) * (row.quantity || 0))
        }
        setTopProducts(
          Array.from(productTotals.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5),
        )
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [supabase])

  const totalRevenue30d = useMemo(() => revenueSeries.reduce((sum, p) => sum + p.revenue, 0), [revenueSeries])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className={i === 0 ? "md:col-span-2" : ""}>
            <CardHeader>
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Revenue, last 30 days</CardTitle>
          <CardDescription>Rs. {totalRevenue30d.toLocaleString()} total across all orders</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-64 w-full">
            <AreaChart data={revenueSeries} margin={{ left: 12, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => `Rs. ${Number(value).toLocaleString()}`} />}
              />
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders by status</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={countConfig} className="h-64 w-full">
            <BarChart data={statusSeries} margin={{ top: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top vendors by revenue</CardTitle>
          <CardDescription>All time, gross order subtotal</CardDescription>
        </CardHeader>
        <CardContent>
          {topVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No vendor sales yet</p>
          ) : (
            <ChartContainer config={amountConfig} className="h-64 w-full">
              <BarChart data={topVendors} layout="vertical" margin={{ left: 16, right: 48 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel formatter={(value) => `Rs. ${Number(value).toLocaleString()}`} />}
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top products by revenue</CardTitle>
          <CardDescription>All time, across every vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No product sales yet</p>
          ) : (
            <ChartContainer config={amountConfig} className="h-64 w-full">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 16, right: 64 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={180}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel formatter={(value) => `Rs. ${Number(value).toLocaleString()}`} />}
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
