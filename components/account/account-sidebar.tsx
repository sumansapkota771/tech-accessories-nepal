"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Package, Settings, Heart, LogOut, Star } from "lucide-react"
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
    {
      href: "/account/reviews",
      label: "My Reviews",
      icon: Star,
      active: pathname === "/account/reviews",
    },
  ]

  return (
    <>
      {/* Mobile horizontal tabs */}
      <div className="lg:hidden mb-6 -mx-4 px-4">
        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-2">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.active ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap text-xs"
                >
                  <item.icon className="h-3.5 w-3.5 mr-1.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
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
      </div>
    </>
  )
}
