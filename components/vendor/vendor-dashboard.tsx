"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { VendorProducts } from "./vendor-products"
import { VendorOrders } from "./vendor-orders"
import { VendorStats } from "./vendor-stats"
import { VendorAnalytics } from "./vendor-analytics"
import { VendorSettings } from "./vendor-settings"
import { VendorDocuments } from "./vendor-documents"
import { VendorDeliverySettings } from "./vendor-delivery-settings"
import { VendorEarnings } from "./vendor-earnings"
import { VendorNotifications } from "./vendor-notifications"
import { VendorReviews } from "./vendor-reviews"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faGauge,
  faChartLine,
  faBoxOpen,
  faCartShopping,
  faGear,
  faStore,
  faFileLines,
  faTruck,
  faWallet,
  faBell,
  faStar,
} from "@fortawesome/free-solid-svg-icons"
import type { Vendor } from "@/lib/types"

interface VendorDashboardProps {
  vendor: Vendor
  userId: string
}

const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: faGauge },
  { value: "analytics", label: "Analytics", icon: faChartLine },
  { value: "products", label: "Products", icon: faBoxOpen },
  { value: "orders", label: "Orders", icon: faCartShopping },
  { value: "reviews", label: "Reviews", icon: faStar },
  { value: "documents", label: "Documents", icon: faFileLines },
  { value: "delivery", label: "Delivery", icon: faTruck },
  { value: "earnings", label: "Earnings", icon: faWallet },
  { value: "notifications", label: "Notifications", icon: faBell },
  { value: "settings", label: "Store Settings", icon: faGear },
] as const

type VendorTab = (typeof NAV_ITEMS)[number]["value"]

const TAB_META: Record<VendorTab, { subtitle: string }> = {
  overview: { subtitle: "A snapshot of your store performance" },
  analytics: { subtitle: "Revenue and order trends for your store" },
  products: { subtitle: "Manage your product listings" },
  orders: { subtitle: "Confirm, ship, and track your orders" },
  reviews: { subtitle: "Respond to customer reviews" },
  documents: { subtitle: "Upload and manage verification documents" },
  delivery: { subtitle: "Configure your delivery settings" },
  earnings: { subtitle: "View your wallet balance and payout history" },
  notifications: { subtitle: "Stay updated with your store activity" },
  settings: { subtitle: "Your store profile and account details" },
}

export function VendorDashboard({ vendor, userId }: VendorDashboardProps) {
  const [activeTab, setActiveTab] = useState<VendorTab>("overview")
  const activeNavItem = NAV_ITEMS.find((item) => item.value === activeTab)!

  return (
    <DashboardShell
      sidebarHeader={
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="h-9 w-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.store_name} className="h-full w-full object-cover" />
            ) : (
              <FontAwesomeIcon icon={faStore} className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{vendor.store_name}</p>
            <Badge variant="secondary" className="text-xs capitalize mt-0.5">
              {vendor.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      }
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={(value) => setActiveTab(value as VendorTab)}
      topbarTitle={activeNavItem.label}
      topbarSubtitle={TAB_META[activeTab].subtitle}
      roleLabel="Vendor"
    >
      {activeTab === "overview" && <VendorStats vendorId={vendor.id} />}
      {activeTab === "analytics" && <VendorAnalytics vendorId={vendor.id} />}
      {activeTab === "products" && <VendorProducts vendorId={vendor.id} />}
      {activeTab === "orders" && <VendorOrders vendorId={vendor.id} />}
      {activeTab === "reviews" && <VendorReviews vendorId={vendor.id} />}
      {activeTab === "documents" && <VendorDocuments vendorId={vendor.id} />}
      {activeTab === "delivery" && <VendorDeliverySettings vendor={vendor} />}
      {activeTab === "earnings" && <VendorEarnings vendorId={vendor.id} />}
      {activeTab === "notifications" && <VendorNotifications userId={userId} />}
      {activeTab === "settings" && <VendorSettings vendor={vendor} />}
    </DashboardShell>
  )
}
