"use client"

import { useState } from "react"
import { AdminProducts } from "./admin-products"
import { AdminOrders } from "./admin-orders"
import { AdminUsers } from "./admin-users"
import { AdminStats } from "./admin-stats"
import { AdminAnalytics } from "./admin-analytics"
import { AdminCategories } from "./admin-categories"
import { AdminVendors } from "./admin-vendors"
import { AdminSettings } from "./admin-settings"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  faGauge,
  faChartLine,
  faBoxOpen,
  faTags,
  faStore,
  faCartShopping,
  faUsers,
  faGear,
} from "@fortawesome/free-solid-svg-icons"

const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: faGauge },
  { value: "analytics", label: "Analytics", icon: faChartLine },
  { value: "products", label: "Products", icon: faBoxOpen },
  { value: "categories", label: "Categories", icon: faTags },
  { value: "vendors", label: "Vendors", icon: faStore },
  { value: "orders", label: "Orders", icon: faCartShopping },
  { value: "users", label: "Users", icon: faUsers },
  { value: "settings", label: "Settings", icon: faGear },
] as const

type AdminTab = (typeof NAV_ITEMS)[number]["value"]

const TAB_META: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "A snapshot of store performance" },
  analytics: { title: "Analytics", subtitle: "Revenue, orders, and vendor trends" },
  products: { title: "Products", subtitle: "Review and manage every product listing" },
  categories: { title: "Categories", subtitle: "Organize the storefront catalog" },
  vendors: { title: "Vendors", subtitle: "Approve applications and manage sellers" },
  orders: { title: "Orders", subtitle: "Track every order across all vendors" },
  users: { title: "Users", subtitle: "Manage customer and staff accounts" },
  settings: { title: "Settings", subtitle: "Your account and platform details" },
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const meta = TAB_META[activeTab]

  return (
    <DashboardShell
      sidebarHeader={
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="/logo-mark.png" alt="" className="h-8 w-8 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Tech Accessories</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Admin Panel</p>
          </div>
        </div>
      }
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={(value) => setActiveTab(value as AdminTab)}
      topbarTitle={meta.title}
      topbarSubtitle={meta.subtitle}
      roleLabel="Administrator"
    >
      {activeTab === "overview" && <AdminStats />}
      {activeTab === "analytics" && <AdminAnalytics />}
      {activeTab === "products" && <AdminProducts />}
      {activeTab === "categories" && <AdminCategories />}
      {activeTab === "vendors" && <AdminVendors />}
      {activeTab === "orders" && <AdminOrders />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "settings" && <AdminSettings />}
    </DashboardShell>
  )
}
