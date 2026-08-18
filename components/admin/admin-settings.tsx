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
import type { Profile } from "@/lib/types"
import {
  Settings,
  Shield,
  Server,
  Database,
  Bell,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"

interface PlatformStats {
  totalUsers: number
  totalVendors: number
  totalProducts: number
  totalOrders: number
  totalReviews: number
  dbSize: string
}

export function AdminSettings() {
  const [admin, setAdmin] = useState<Profile | null>(null)
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, usersRes, vendorsRes, productsRes, ordersRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ])

      setAdmin(profileRes.data as Profile | null)
      setStats({
        totalUsers: usersRes.count || 0,
        totalVendors: vendorsRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalReviews: reviewsRes.count || 0,
        dbSize: "—",
      })
    } catch (err) {
      console.error("Error fetching settings:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
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
      {/* Admin Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Account
          </CardTitle>
          <CardDescription>Your administrator account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{admin?.full_name || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{admin?.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge className="bg-red-100 text-red-700">Administrator</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium">
                {admin?.created_at ? format(new Date(admin.created_at), "MMMM dd, yyyy") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Platform Information
          </CardTitle>
          <CardDescription>System overview and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Platform</p>
              </div>
              <p className="text-sm font-medium">Tech Accessories Nepal</p>
              <p className="text-xs text-muted-foreground">Multi-vendor marketplace</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Approval Model</p>
              </div>
              <p className="text-sm font-medium">Manual Review</p>
              <p className="text-xs text-muted-foreground">Products require QC approval</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Seller Trial</p>
              </div>
              <p className="text-sm font-medium">3 Months Free</p>
              <p className="text-xs text-muted-foreground">0% commission on approval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Platform Statistics
              </CardTitle>
              <CardDescription>Current data overview</CardDescription>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-lg font-semibold">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Vendors</p>
                <p className="text-lg font-semibold">{stats.totalVendors.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-lg font-semibold">{stats.totalProducts.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-semibold">{stats.totalOrders.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Reviews</p>
                <p className="text-lg font-semibold">{stats.totalReviews.toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
