"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Package, Settings, Heart, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function AccountSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const menuItems = [
    {
      href: "/account",
      label: "Overview",
      icon: User,
      active: pathname === "/account",
    },
    {
      href: "/account/orders",
      label: "My Orders",
      icon: Package,
      active: pathname === "/account/orders",
    },
    {
      href: "/account/profile",
      label: "Profile Settings",
      icon: Settings,
      active: pathname === "/account/profile",
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      icon: Heart,
      active: pathname === "/account/wishlist",
    },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant={item.active ? "default" : "ghost"} className="w-full justify-start" size="sm">
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </nav>
      </CardContent>
    </Card>
  )
}
