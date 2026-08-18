"use client"

import { useState, Suspense, lazy } from "react"
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
  faCheckDouble,
  faStar,
  faDollarSign,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons"

const AdminStats = lazy(() => import("./admin-stats").then((m) => ({ default: m.AdminStats })))
const AdminAnalytics = lazy(() => import("./admin-analytics").then((m) => ({ default: m.AdminAnalytics })))
const AdminProducts = lazy(() => import("./admin-products").then((m) => ({ default: m.AdminProducts })))
const AdminQualityControl = lazy(() => import("./admin-quality-control").then((m) => ({ default: m.AdminQualityControl })))
const AdminCategories = lazy(() => import("./admin-categories").then((m) => ({ default: m.AdminCategories })))
const AdminVendors = lazy(() => import("./admin-vendors").then((m) => ({ default: m.AdminVendors })))
const AdminOrders = lazy(() => import("./admin-orders").then((m) => ({ default: m.AdminOrders })))
const AdminReviews = lazy(() => import("./admin-reviews").then((m) => ({ default: m.AdminReviews })))
const AdminFinance = lazy(() => import("./admin-finance").then((m) => ({ default: m.AdminFinance })))
const AdminUsers = lazy(() => import("./admin-users").then((m) => ({ default: m.AdminUsers })))
const AdminAuditLogs = lazy(() => import("./admin-audit-logs").then((m) => ({ default: m.AdminAuditLogs })))
const AdminSettings = lazy(() => import("./admin-settings").then((m) => ({ default: m.AdminSettings })))

function TabLoader() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  )
}

const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: faGauge },
  { value: "analytics", label: "Analytics", icon: faChartLine },
  { value: "products", label: "Products", icon: faBoxOpen },
  { value: "qc", label: "Quality Control", icon: faCheckDouble },
  { value: "categories", label: "Categories", icon: faTags },
  { value: "vendors", label: "Vendors", icon: faStore },
  { value: "orders", label: "Orders", icon: faCartShopping },
  { value: "reviews", label: "Reviews", icon: faStar },
  { value: "finance", label: "Finance", icon: faDollarSign },
  { value: "users", label: "Users", icon: faUsers },
  { value: "audit", label: "Audit Logs", icon: faClipboardList },
  { value: "settings", label: "Settings", icon: faGear },
] as const

type AdminTab = (typeof NAV_ITEMS)[number]["value"]

const TAB_META: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Real-time platform metrics and KPIs" },
  analytics: { title: "Analytics", subtitle: "Revenue, orders, and vendor trends" },
  products: { title: "Products", subtitle: "Review and manage every product listing" },
  qc: { title: "Quality Control", subtitle: "Review pending products and manage QC workflow" },
  categories: { title: "Categories", subtitle: "Organize the storefront catalog" },
  vendors: { title: "Vendors", subtitle: "Approve applications and manage sellers" },
  orders: { title: "Orders", subtitle: "Track every order across all vendors" },
  reviews: { title: "Reviews", subtitle: "Moderate customer reviews and manage reports" },
  finance: { title: "Finance", subtitle: "Platform earnings, commissions, and payouts" },
  users: { title: "Users", subtitle: "Manage buyers, vendors, and administrators" },
  audit: { title: "Audit Logs", subtitle: "Complete record of all platform actions" },
  settings: { title: "Settings", subtitle: "Admin account and platform information" },
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
      <Suspense fallback={<TabLoader />}>
        {activeTab === "overview" && <AdminStats />}
        {activeTab === "analytics" && <AdminAnalytics />}
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "qc" && <AdminQualityControl />}
        {activeTab === "categories" && <AdminCategories />}
        {activeTab === "vendors" && <AdminVendors />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "reviews" && <AdminReviews />}
        {activeTab === "finance" && <AdminFinance />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "audit" && <AdminAuditLogs />}
        {activeTab === "settings" && <AdminSettings />}
      </Suspense>
    </DashboardShell>
  )
}
