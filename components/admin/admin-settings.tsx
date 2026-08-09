"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

function getInitials(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "A"
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AdminSettings() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const initials = getInitials(profile?.full_name || user?.email || "")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Administrator profile for the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold shrink-0">
                {initials}
              </span>
              <div>
                <p className="font-medium">{profile?.full_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  Administrator
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/account/profile">Edit Profile</Link>
            </Button>
          </div>
          {profile?.phone && <p className="text-sm text-muted-foreground mt-4 border-t pt-4">Phone: {profile.phone}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription>Current store-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Platform name</span>
            <span className="font-medium">Tech Accessories Nepal</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Payment method</span>
            <span className="font-medium">Cash on Delivery</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="font-medium">Self-shipped by each vendor</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">New vendor approval</span>
            <span className="font-medium">Manual review required</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
