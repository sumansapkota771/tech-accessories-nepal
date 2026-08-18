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
import type { Vendor, VendorStatus } from "@/lib/types"
import { updateVendorStatus, updateVendorCommission } from "@/lib/actions/vendors"
import { createVendorForUser } from "@/lib/actions/admin"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faMagnifyingGlass,
  faCheck,
  faXmark,
  faBan,
  faRotateLeft,
  faPlus,
  faEye,
  faClock,
  faShield,
} from "@fortawesome/free-solid-svg-icons"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { AdminVendorDetail } from "./admin-vendor-detail"

export function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [rejectionDialogVendorId, setRejectionDialogVendorId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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

  async function handleStatusUpdate(vendorId: string, status: VendorStatus, reason?: string) {
    setActionLoading(vendorId)
    try {
      const result = await updateVendorStatus(vendorId, status, reason)
      if (result.error) throw new Error(result.error)
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? { ...v, status, ...(status === "rejected" && reason ? { rejection_reason: reason } : {}) }
            : v,
        ),
      )
      toast({ title: "Vendor updated", description: `Store status changed to ${status.replace("_", " ")}` })
    } catch (error) {
      console.error("Error updating vendor:", error)
      toast({ title: "Error", description: "Failed to update vendor", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCommissionUpdate(vendorId: string, rate: number) {
    try {
      const result = await updateVendorCommission(vendorId, rate)
      if (result.error) throw new Error(result.error)
      setVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, commission_rate: rate } : v)))
      toast({ title: "Commission updated", description: `Commission rate set to ${rate}%` })
    } catch (error) {
      console.error("Error updating commission rate:", error)
      toast({ title: "Error", description: "Failed to update commission rate", variant: "destructive" })
    }
  }

  function openRejectionDialog(vendorId: string) {
    setRejectionDialogVendorId(vendorId)
    setRejectionReason("")
  }

  function handleRejectConfirm() {
    if (!rejectionDialogVendorId) return
    handleStatusUpdate(rejectionDialogVendorId, "rejected", rejectionReason || undefined)
    setRejectionDialogVendorId(null)
    setRejectionReason("")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "under_review":
        return "bg-blue-100 text-blue-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      case "rejected":
        return "bg-gray-100 text-gray-800"
      case "blocked":
        return "bg-red-200 text-red-900"
      case "expired":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.full_name && vendor.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
    <>
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
                    application review. The person must have signed up already — this can&apos;t create a new
                    account.
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
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
                />
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
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Location</TableHead>
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
                        {vendor.full_name && (
                          <div className="text-xs text-muted-foreground">{vendor.full_name}</div>
                        )}
                        <div className="text-sm text-muted-foreground">/store/{vendor.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{vendor.location || "—"}</span>
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
                            handleCommissionUpdate(vendor.id, rate)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(vendor.status)}>
                        {vendor.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVendor(vendor)}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                        </Button>

                        {vendor.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "under_review")}
                              title="Start Review"
                            >
                              <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => openRejectionDialog(vendor.id)}
                              title="Reject"
                            >
                              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {vendor.status === "under_review" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "approved")}
                              title="Approve"
                            >
                              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => openRejectionDialog(vendor.id)}
                              title="Reject"
                            >
                              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {vendor.status === "approved" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "suspended")}
                              title="Suspend"
                            >
                              <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "blocked")}
                              title="Block"
                            >
                              <FontAwesomeIcon icon={faShield} className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {vendor.status === "rejected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === vendor.id}
                            onClick={() => handleStatusUpdate(vendor.id, "approved")}
                            title="Re-approve"
                          >
                            <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                          </Button>
                        )}

                        {vendor.status === "suspended" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "approved")}
                              title="Re-approve"
                            >
                              <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleStatusUpdate(vendor.id, "blocked")}
                              title="Block"
                            >
                              <FontAwesomeIcon icon={faShield} className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {vendor.status === "blocked" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === vendor.id}
                            onClick={() => handleStatusUpdate(vendor.id, "approved")}
                            title="Re-approve"
                          >
                            <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                          </Button>
                        )}

                        {vendor.status === "expired" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === vendor.id}
                            onClick={() => handleStatusUpdate(vendor.id, "approved")}
                            title="Re-approve"
                          >
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

      <Dialog
        open={rejectionDialogVendorId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectionDialogVendorId(null)
            setRejectionReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this vendor. This will be shared with the seller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe why this vendor is being rejected..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionDialogVendorId(null)
                  setRejectionReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={actionLoading === rejectionDialogVendorId}
                onClick={handleRejectConfirm}
              >
                {actionLoading === rejectionDialogVendorId ? "Rejecting..." : "Reject Vendor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedVendor && (
        <AdminVendorDetail vendorId={selectedVendor.id} onClose={() => setSelectedVendor(null)} />
      )}
    </>
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
  const [email, setEmail] = useState("")
  const [storeName, setStoreName] = useState("")
  const [commissionRate, setCommissionRate] = useState(10)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createVendorForUser(email.trim(), storeName, commissionRate)
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }
      toast({ title: "Vendor created", description: `${storeName} is live and approved.` })
      setEmail("")
      setStoreName("")
      setCommissionRate(10)
      onSuccess()
    } catch (error) {
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="already-signed-up@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeName">Store Name *</Label>
        <Input
          id="storeName"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="commissionRate">Commission %</Label>
        <Input
          id="commissionRate"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={commissionRate}
          onChange={(e) => setCommissionRate(Number(e.target.value))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Vendor"}
        </Button>
      </div>
    </form>
  )
}
