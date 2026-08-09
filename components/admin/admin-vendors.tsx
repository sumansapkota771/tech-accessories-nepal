"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Vendor } from "@/lib/types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass, faCheck, faXmark, faBan, faRotateLeft, faPlus } from "@fortawesome/free-solid-svg-icons"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchVendors()
  }, [])

  async function fetchVendors() {
    try {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false })
      if (error) throw error
      setVendors(data || [])
    } catch (error) {
      console.error("Error fetching vendors:", error)
      toast({ title: "Error", description: "Failed to fetch vendors", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function updateVendorStatus(vendorId: string, status: Vendor["status"]) {
    try {
      const { error } = await supabase.from("vendors").update({ status }).eq("id", vendorId)
      if (error) throw error

      setVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, status } : v)))
      toast({ title: "Vendor updated", description: `Store status changed to ${status}` })
    } catch (error) {
      console.error("Error updating vendor:", error)
      toast({ title: "Error", description: "Failed to update vendor", variant: "destructive" })
    }
  }

  async function updateCommissionRate(vendorId: string, rate: number) {
    try {
      const { error } = await supabase.from("vendors").update({ commission_rate: rate }).eq("id", vendorId)
      if (error) throw error

      setVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, commission_rate: rate } : v)))
    } catch (error) {
      console.error("Error updating commission rate:", error)
      toast({ title: "Error", description: "Failed to update commission rate", variant: "destructive" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      case "rejected":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.store_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>Review seller applications and manage stores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vendors</CardTitle>
            <CardDescription>Review seller applications and manage stores</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
                Create Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Vendor for Existing User</DialogTitle>
                <DialogDescription>
                  Turns an already-registered account straight into an approved store, skipping the normal
                  application review. The person must have signed up already — this can't create a new account.
                </DialogDescription>
              </DialogHeader>
              <CreateVendorForm
                onSuccess={() => {
                  setIsCreateDialogOpen(false)
                  fetchVendors()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{vendor.store_name}</div>
                      <div className="text-sm text-muted-foreground">/store/{vendor.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(vendor.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={vendor.commission_rate}
                      className="w-20"
                      onBlur={(e) => {
                        const rate = Number(e.target.value)
                        if (!Number.isNaN(rate) && rate !== vendor.commission_rate) {
                          updateCommissionRate(vendor.id, rate)
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(vendor.status)}>{vendor.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {vendor.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateVendorStatus(vendor.id, "approved")}
                          >
                            <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateVendorStatus(vendor.id, "rejected")}
                          >
                            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {vendor.status === "approved" && (
                        <Button variant="outline" size="sm" onClick={() => updateVendorStatus(vendor.id, "suspended")}>
                          <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                        </Button>
                      )}
                      {(vendor.status === "suspended" || vendor.status === "rejected") && (
                        <Button variant="outline" size="sm" onClick={() => updateVendorStatus(vendor.id, "approved")}>
                          <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No vendors found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

interface CreateVendorFormProps {
  onSuccess: () => void
}

function CreateVendorForm({ onSuccess }: CreateVendorFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    storeName: "",
    description: "",
    phone: "",
    address: "",
    commissionRate: 10,
  })
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", formData.email.trim())
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        toast({
          title: "No account found",
          description: `${formData.email} hasn't signed up yet. They need to create an account first.`,
          variant: "destructive",
        })
        return
      }

      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle()

      if (existingVendor) {
        toast({
          title: "Already a vendor",
          description: "This account already has a store — manage it from the table instead.",
          variant: "destructive",
        })
        return
      }

      const baseSlug = slugify(formData.storeName)
      const slug = baseSlug ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : `store-${Date.now()}`

      const { error: vendorError } = await supabase.from("vendors").insert({
        user_id: profile.id,
        store_name: formData.storeName,
        slug,
        description: formData.description || null,
        phone: formData.phone || null,
        address: formData.address || null,
        status: "approved",
        commission_rate: formData.commissionRate,
      })
      if (vendorError) throw vendorError

      const { error: roleError } = await supabase.from("profiles").update({ role: "vendor" }).eq("id", profile.id)
      if (roleError) throw roleError

      toast({ title: "Vendor created", description: `${formData.storeName} is live and approved.` })
      onSuccess()
    } catch (error) {
      console.error("Error creating vendor:", error)
      toast({ title: "Error", description: "Failed to create vendor", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Account Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="already-signed-up@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeName">Store Name *</Label>
        <Input
          id="storeName"
          value={formData.storeName}
          onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commissionRate">Commission %</Label>
          <Input
            id="commissionRate"
            type="number"
            value={formData.commissionRate}
            onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Vendor"}
        </Button>
      </div>
    </form>
  )
}
