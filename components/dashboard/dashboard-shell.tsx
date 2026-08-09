"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBars } from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"

export interface DashboardNavItem {
  value: string
  label: string
  icon: IconDefinition
}

interface DashboardShellProps {
  sidebarHeader: ReactNode
  navItems: readonly DashboardNavItem[]
  activeTab: string
  onTabChange: (value: string) => void
  topbarTitle: string
  topbarSubtitle?: string
  roleLabel: string
  children: ReactNode
}

export function DashboardShell({
  sidebarHeader,
  navItems,
  activeTab,
  onTabChange,
  topbarTitle,
  topbarSubtitle,
  roleLabel,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const renderNav = (onNavigate?: () => void) => (
    <ul className="flex flex-col gap-1 p-2">
      {navItems.map((item) => (
        <li key={item.value}>
          <button
            onClick={() => {
              onTabChange(item.value)
              onNavigate?.()
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === item.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="h-4 w-4" fixedWidth />
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed, full-height sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 border-r bg-card overflow-y-auto z-30">
        <div className="border-b shrink-0">{sidebarHeader}</div>
        {renderNav()}
      </aside>

      {/* Main content, offset by sidebar width on desktop */}
      <div className="md:pl-64">
        <div className="px-4 py-6 md:px-6 space-y-6">
          <DashboardTopbar
            title={topbarTitle}
            subtitle={topbarSubtitle}
            roleLabel={roleLabel}
            leading={
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden shrink-0">
                    <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col">
                  <div className="border-b shrink-0">{sidebarHeader}</div>
                  <div className="flex-1 overflow-y-auto">{renderNav(() => setMobileOpen(false))}</div>
                </SheetContent>
              </Sheet>
            }
          />
          {children}
        </div>
      </div>
    </div>
  )
}
