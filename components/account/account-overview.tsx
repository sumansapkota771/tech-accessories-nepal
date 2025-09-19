import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Heart, User, CreditCard } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AccountOverviewProps {
  user: SupabaseUser
}

export async function AccountOverview({ user }: AccountOverviewProps) {
  const supabase = await createClient()

  // Get user stats
  const [ordersResult, cartResult] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact" }).eq("user_id", user.id),
    supabase.from("cart_items").select("quantity").eq("user_id", user.id),
  ])

  const totalOrders = ordersResult.count || 0
  const cartItems = cartResult.data?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0]}!
              </h2>
              <p className="text-muted-foreground">Manage your account and track your orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartItems}</div>
            <p className="text-xs text-muted-foreground">Items in cart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Saved items</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
              <Link href="/account/orders" className="flex flex-col items-center gap-2">
                <Package className="h-6 w-6" />
                <span>View Orders</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
              <Link href="/account/profile" className="flex flex-col items-center gap-2">
                <User className="h-6 w-6" />
                <span>Edit Profile</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
              <Link href="/cart" className="flex flex-col items-center gap-2">
                <CreditCard className="h-6 w-6" />
                <span>View Cart</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
              <Link href="/products" className="flex flex-col items-center gap-2">
                <Heart className="h-6 w-6" />
                <span>Continue Shopping</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
