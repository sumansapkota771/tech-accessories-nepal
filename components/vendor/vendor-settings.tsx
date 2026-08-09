"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Vendor } from "@/lib/types"

function getInitials(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "V"
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface VendorSettingsProps {
  vendor: Vendor
}

export function VendorSettings({ vendor }: VendorSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    storeName: vendor.store_name,
    description: vendor.description || "",
    phone: vendor.phone || "",
    address: vendor.address || "",
    logoUrl: vendor.logo_url || "",
    bannerUrl: vendor.banner_url || "",
  })
  const [accountEmail, setAccountEmail] = useState("")
  const [accountName, setAccountName] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setAccountEmail(user.email ?? "")
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      setAccountName(profile?.full_name || user.email?.split("@")[0] || "")
    }
    loadAccount()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          store_name: formData.storeName,
          description: formData.description,
          phone: formData.phone,
          address: formData.address,
          logo_url: formData.logoUrl || null,
          banner_url: formData.bannerUrl || null,
        })
        .eq("id", vendor.id)

      if (error) throw error

      toast({ title: "Store updated", description: "Your store settings have been saved." })
    } catch (error) {
      console.error("Error updating store:", error)
      toast({ title: "Error", description: "Failed to update store settings.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>The personal login behind this store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-semibold shrink-0">
                {getInitials(accountName)}
              </span>
              <div>
                <p className="font-medium">{accountName || "—"}</p>
                <p className="text-sm text-muted-foreground">{accountEmail}</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/account/profile">Edit Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input id="storeName" name="storeName" value={formData.storeName} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              label="Store Logo"
              value={formData.logoUrl}
              onChange={(url) => setFormData({ ...formData, logoUrl: url })}
              folder="vendor-logo"
            />
            <ImageUpload
              label="Store Banner"
              value={formData.bannerUrl}
              onChange={(url) => setFormData({ ...formData, bannerUrl: url })}
              folder="vendor-banner"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Storefront URL: <span className="font-mono">/store/{vendor.slug}</span> · Commission rate:{" "}
            {vendor.commission_rate}%
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
        </CardContent>
      </Card>
    </div>
  )
}
