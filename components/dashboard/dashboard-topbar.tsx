"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createBrowserClient } from "@/lib/supabase/client"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChevronDown,
  faUser,
  faIdCard,
  faReceipt,
  faArrowUpRightFromSquare,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons"

interface DashboardTopbarProps {
  title: string
  subtitle?: string
  roleLabel: string
  leading?: ReactNode
}

function getInitials(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "U"
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function DashboardTopbar({ title, subtitle, roleLabel, leading }: DashboardTopbarProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    let active = true

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !active) return

      setEmail(user.email ?? "")

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      if (!active) return
      setName(profile?.full_name || user.email?.split("@")[0] || "Account")
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const initials = getInitials(name || email)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        {leading}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View Site</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 hover:bg-muted transition-colors">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                {loading ? "" : initials}
              </span>
              <span className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium">{loading ? "Loading..." : name}</span>
                <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
              </span>
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{name}</span>
                <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5 text-muted-foreground" />
                My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/profile" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faIdCard} className="h-3.5 w-3.5 text-muted-foreground" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faReceipt} className="h-3.5 w-3.5 text-muted-foreground" />
                My Orders &amp; Tracking
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                View Site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
