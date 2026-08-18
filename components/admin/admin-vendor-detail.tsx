"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import type {
  Vendor,
  SellerDocument,
  SellerVerification,
  SellerPromotion,
  AuditLog,
  Product,
  Suborder,
} from "@/lib/types"
import {
  updateVendorStatus,
  reviewSellerDocument,
  createSellerPromotion,
} from "@/lib/actions/vendors"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faXmark,
  faCheck,
  faXmark as faXmarkSolid,
  faClock,
  faBan,
  faShield,
  faRotateLeft,
  faFile,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface AdminVendorDetailProps {
  vendorId: string
  onClose: () => void
}

type TabId = "overview" | "documents" | "products" | "orders" | "promotion" | "activity"

export function AdminVendorDetail({ vendorId, onClose }: AdminVendorDetailProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [profile, setProfile] = useState<{ email: string; full_name: string | null } | null>(null)
  const [verification, setVerification] = useState<SellerVerification | null>(null)

  const [documents, setDocuments] = useState<SellerDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const [suborders, setSuborders] = useState<Suborder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [promotion, setPromotion] = useState<SellerPromotion | null>(null)
  const [promotionLoading, setPromotionLoading] = useState(false)
  const [promotionForm, setPromotionForm] = useState({
    promotion_type: "trial" as "trial" | "campaign" | "custom",
    commission_rate: 0,
    start_date: "",
    end_date: "",
    description: "",
  })

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [rejectionDialogDocId, setRejectionDialogDocId] = useState<string | null>(null)
  const [docRejectionReason, setDocRejectionReason] = useState("")

  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchVendor() {
      try {
        const { data, error } = await supabase.from("vendors").select("*").eq("id", vendorId).single()
        if (error) throw error
        setVendor(data)

        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", data.user_id)
          .single()
        if (profileData) setProfile(profileData)

        const { data: verData } = await supabase
          .from("seller_verifications")
          .select("*")
          .eq("vendor_id", vendorId)
          .single()
        if (verData) setVerification(verData)

        setPromotionForm((prev) => ({
          ...prev,
          commission_rate: data.commission_rate,
        }))
      } catch (error) {
        console.error("Error fetching vendor:", error)
        toast({ title: "Error", description: "Failed to load vendor details", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchVendor()
  }, [vendorId])

  useEffect(() => {
    if (activeTab === "documents") fetchDocuments()
    if (activeTab === "products") fetchProducts()
    if (activeTab === "orders") fetchOrders()
    if (activeTab === "promotion") fetchPromotion()
    if (activeTab === "activity") fetchActivity()
  }, [activeTab])

  async function fetchDocuments() {
    setDocumentsLoading(true)
    try {
      const { data, error } = await supabase
        .from("seller_documents")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  async function fetchProducts() {
    setProductsLoading(true)
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setProductsLoading(false)
    }
  }

  async function fetchOrders() {
    setOrdersLoading(true)
    try {
      const { data, error } = await supabase
        .from("suborders")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setSuborders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setOrdersLoading(false)
    }
  }

  async function fetchPromotion() {
    setPromotionLoading(true)
    try {
      const { data, error } = await supabase
        .from("seller_promotions")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      setPromotion(data)
    } catch (error) {
      console.error("Error fetching promotion:", error)
    } finally {
      setPromotionLoading(false)
    }
  }

  async function fetchActivity() {
    setActivityLoading(true)
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "vendor")
        .eq("entity_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error
      setAuditLogs(data || [])
    } catch (error) {
      console.error("Error fetching activity:", error)
    } finally {
      setActivityLoading(false)
    }
  }

  async function handleVendorStatus(status: Vendor["status"], reason?: string) {
    if (!vendor) return
    setActionLoading(status)
    try {
      const result = await updateVendorStatus(vendor.id, status, reason)
      if (result.error) throw new Error(result.error)
      setVendor((prev) => (prev ? { ...prev, status } : null))
      toast({ title: "Vendor updated", description: `Status changed to ${status.replace("_", " ")}` })
    } catch (error) {
      console.error("Error updating vendor:", error)
      toast({ title: "Error", description: "Failed to update vendor", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDocumentReview(docId: string, status: "approved" | "rejected", reason?: string) {
    setActionLoading(`doc-${docId}`)
    try {
      const result = await reviewSellerDocument(docId, status, reason)
      if (result.error) throw new Error(result.error)
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status, verified_at: new Date().toISOString() } : d)),
      )
      toast({ title: "Document reviewed", description: `Document ${status}` })
    } catch (error) {
      console.error("Error reviewing document:", error)
      toast({ title: "Error", description: "Failed to review document", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreatePromotion() {
    if (!vendor) return
    setActionLoading("promotion")
    try {
      const result = await createSellerPromotion({
        vendor_id: vendor.id,
        promotion_type: promotionForm.promotion_type,
        commission_rate: promotionForm.commission_rate,
        start_date: promotionForm.start_date,
        end_date: promotionForm.end_date,
        description: promotionForm.description || undefined,
      })
      if (result.error) throw new Error(result.error)
      toast({ title: "Promotion created", description: "New promotion has been applied" })
      fetchPromotion()
      setPromotionForm((prev) => ({
        ...prev,
        description: "",
        start_date: "",
        end_date: "",
      }))
    } catch (error) {
      console.error("Error creating promotion:", error)
      toast({ title: "Error", description: "Failed to create promotion", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  function getStatusColor(status: string) {
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

  function getDocStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  function getVerificationColor(status: string) {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
      case "unverified":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "documents", label: "Documents" },
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "promotion", label: "Promotion" },
    { id: "activity", label: "Activity" },
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="space-y-6">
            <div className="h-12 bg-muted animate-pulse rounded w-1/3" />
            <div className="h-8 bg-muted animate-pulse rounded w-1/4" />
            <div className="grid grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">Vendor not found</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{vendor.store_name}</h1>
                  <Badge className={getStatusColor(vendor.status)}>
                    {vendor.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">/store/{vendor.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {vendor.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    disabled={actionLoading === "under_review"}
                    onClick={() => handleVendorStatus("under_review")}
                  >
                    <FontAwesomeIcon icon={faClock} className="h-4 w-4 mr-2" />
                    Start Review
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading === "rejected"}
                    onClick={() => handleVendorStatus("rejected")}
                  >
                    Reject
                  </Button>
                </>
              )}
              {vendor.status === "under_review" && (
                <>
                  <Button
                    size="sm"
                    disabled={actionLoading === "approved"}
                    onClick={() => handleVendorStatus("approved")}
                  >
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading === "rejected"}
                    onClick={() => handleVendorStatus("rejected")}
                  >
                    Reject
                  </Button>
                </>
              )}
              {vendor.status === "approved" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === "suspended"}
                    onClick={() => handleVendorStatus("suspended")}
                  >
                    <FontAwesomeIcon icon={faBan} className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading === "blocked"}
                    onClick={() => handleVendorStatus("blocked")}
                  >
                    <FontAwesomeIcon icon={faShield} className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                </>
              )}
              {(vendor.status === "rejected" ||
                vendor.status === "suspended" ||
                vendor.status === "blocked" ||
                vendor.status === "expired") && (
                <Button
                  size="sm"
                  disabled={actionLoading === "approved"}
                  onClick={() => handleVendorStatus("approved")}
                >
                  <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4 mr-2" />
                  Re-approve
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-1 mt-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Full Name" value={vendor.full_name || profile?.full_name || "—"} />
                  <InfoRow label="Email" value={profile?.email || "—"} />
                  <InfoRow label="Phone" value={vendor.phone || "—"} />
                  <InfoRow label="Address" value={vendor.address || "—"} />
                  <InfoRow label="Location" value={vendor.location || "—"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tax Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="PAN Number" value={vendor.pan_number || "—"} />
                  <InfoRow
                    label="PAN Document"
                    value={
                      vendor.pan_file_url ? (
                        <a
                          href={vendor.pan_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Document
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow label="VAT Number" value={vendor.vat_number || "—"} />
                  <InfoRow
                    label="VAT Document"
                    value={
                      vendor.vat_file_url ? (
                        <a
                          href={vendor.vat_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Document
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    label="Business Registration"
                    value={vendor.business_registration_number || "—"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Store Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Store Name" value={vendor.store_name} />
                  <InfoRow
                    label="Description"
                    value={vendor.description || <span className="text-muted-foreground">No description</span>}
                  />
                  <InfoRow label="Commission Rate" value={`${vendor.commission_rate}%`} />
                  <InfoRow label="Created" value={format(new Date(vendor.created_at), "MMM dd, yyyy 'at' h:mm a")} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verification Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {verification ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">PAN Verified</span>
                        {verification.pan_verified ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-600" />
                        ) : (
                          <FontAwesomeIcon icon={faTimesCircle} className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">VAT Verified</span>
                        {verification.vat_verified ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-600" />
                        ) : (
                          <FontAwesomeIcon icon={faTimesCircle} className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Business Verified</span>
                        {verification.business_verified ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-600" />
                        ) : (
                          <FontAwesomeIcon icon={faTimesCircle} className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Overall Status</span>
                        <Badge className={getVerificationColor(verification.overall_status)}>
                          {verification.overall_status}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No verification record found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "documents" && (
            <div>
              {documentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No documents uploaded</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faFile} className="h-3 w-3" />
                              {doc.original_filename || "View File"}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge className={getDocStatusColor(doc.status)}>{doc.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(doc.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.verified_at
                              ? format(new Date(doc.verified_at), "MMM dd, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {doc.status === "pending" && (
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoading === `doc-${doc.id}`}
                                  onClick={() => handleDocumentReview(doc.id, "approved")}
                                >
                                  <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoading === `doc-${doc.id}`}
                                  onClick={() => {
                                    setRejectionDialogDocId(doc.id)
                                    setDocRejectionReason("")
                                  }}
                                >
                                  <FontAwesomeIcon icon={faXmarkSolid} className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === "products" && (
            <div>
              {productsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products listed</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Approval Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>NPR {product.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={product.stock_quantity <= 0 ? "text-red-600 font-medium" : ""}>
                              {product.stock_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getDocStatusColor(product.approval_status)}>
                              {product.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(product.created_at), "MMM dd, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : suborders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suborders.map((suborder) => (
                        <TableRow key={suborder.id}>
                          <TableCell className="font-medium font-mono text-sm">
                            {suborder.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(suborder.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>NPR {suborder.subtotal.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {suborder.commission_rate}% → NPR {suborder.commission_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(suborder.status)}>
                              {suborder.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === "promotion" && (
            <div className="space-y-6">
              {promotionLoading ? (
                <div className="h-32 bg-muted animate-pulse rounded" />
              ) : promotion ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Promotion</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Type" value={<span className="capitalize">{promotion.promotion_type}</span>} />
                    <InfoRow label="Commission Rate" value={`${promotion.commission_rate}%`} />
                    <InfoRow
                      label="Start Date"
                      value={format(new Date(promotion.start_date), "MMM dd, yyyy")}
                    />
                    <InfoRow
                      label="End Date"
                      value={format(new Date(promotion.end_date), "MMM dd, yyyy")}
                    />
                    <InfoRow label="Description" value={promotion.description || "—"} />
                    <InfoRow label="Status" value={<Badge className={getStatusColor(promotion.status)}>{promotion.status}</Badge>} />
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 mb-6 border rounded-lg">
                  <p className="text-muted-foreground">No active promotion</p>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create Promotion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Promotion Type</Label>
                      <Select
                        value={promotionForm.promotion_type}
                        onValueChange={(val: "trial" | "campaign" | "custom") =>
                          setPromotionForm((prev) => ({ ...prev, promotion_type: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="campaign">Campaign</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Commission Rate (%)</Label>
                      <Input
                        type="number"
                        value={promotionForm.commission_rate}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({
                            ...prev,
                            commission_rate: Number(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={promotionForm.start_date}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({ ...prev, start_date: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={promotionForm.end_date}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({ ...prev, end_date: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={promotionForm.description}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        rows={3}
                        placeholder="Optional description for this promotion..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      disabled={
                        actionLoading === "promotion" ||
                        !promotionForm.start_date ||
                        !promotionForm.end_date
                      }
                      onClick={handleCreatePromotion}
                    >
                      {actionLoading === "promotion" ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Promotion"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "activity" && (
            <div>
              {activityLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No activity logs found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM dd, yyyy h:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.actor_email || "System"}
                            {log.actor_role && (
                              <span className="text-muted-foreground ml-1">({log.actor_role})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={rejectionDialogDocId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectionDialogDocId(null)
            setDocRejectionReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This will be shared with the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docRejectionReason">Rejection Reason</Label>
              <Textarea
                id="docRejectionReason"
                value={docRejectionReason}
                onChange={(e) => setDocRejectionReason(e.target.value)}
                placeholder="Describe why this document is being rejected..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionDialogDocId(null)
                  setDocRejectionReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={actionLoading === `doc-${rejectionDialogDocId}`}
                onClick={() => {
                  if (!rejectionDialogDocId) return
                  handleDocumentReview(
                    rejectionDialogDocId,
                    "rejected",
                    docRejectionReason || undefined,
                  )
                  setRejectionDialogDocId(null)
                  setDocRejectionReason("")
                }}
              >
                Reject Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}
