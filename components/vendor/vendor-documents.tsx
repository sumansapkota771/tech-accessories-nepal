"use client"

import { useEffect, useRef, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  createBrowserClient,
} from "@/lib/supabase/client"
import { uploadSellerDocument } from "@/lib/actions/vendors"
import { useToast } from "@/hooks/use-toast"
import type { SellerDocument } from "@/lib/types"
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"

interface VendorDocumentsProps {
  vendorId: string
}

const DOCUMENT_TYPES = [
  { value: "pan" as const, label: "PAN Card", required: true },
  { value: "vat" as const, label: "VAT Registration", required: false },
  { value: "business_registration" as const, label: "Business Registration", required: true },
]

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
const MAX_SIZE_BYTES = 5 * 1024 * 1024

function statusIcon(status: SellerDocument["status"]) {
  switch (status) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-amber-600" />
  }
}

function statusBadge(status: SellerDocument["status"]) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
  }
}

export function VendorDocuments({ vendorId }: VendorDocumentsProps) {
  const [documents, setDocuments] = useState<SellerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const { data, error } = await supabase
        .from("seller_documents")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setDocuments((data as SellerDocument[]) || [])
    } catch (err) {
      console.error("Error fetching documents:", err)
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function getExisting(docType: string) {
    return documents.find((d) => d.document_type === docType) || null
  }

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPG, and PNG files are accepted."
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File must be under 5MB."
    }
    return null
  }

  async function handleUpload(docType: string, file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      toast({ title: "Invalid file", description: validationError, variant: "destructive" })
      return
    }

    setUploading(docType)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const timestamp = Date.now()
      const ext = file.name.split(".").pop() || "pdf"
      const filePath = `${user.id}/documents/${docType}-${timestamp}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        console.error("Storage upload error:", JSON.stringify(uploadError))
        throw new Error(`Storage error: ${uploadError.message}`)
      }

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath)

      const result = await uploadSellerDocument({
        document_type: docType,
        file_url: urlData.publicUrl,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({ title: "Document uploaded", description: `Your ${docType.toUpperCase()} has been uploaded for review.` })
      await fetchDocuments()
    } catch (err: any) {
      console.error("Upload error:", err)
      toast({ title: "Upload failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setUploading(null)
      if (inputRefs.current[docType]) {
        inputRefs.current[docType]!.value = ""
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Manage your business documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Upload and manage your business verification documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_TYPES.map((docType) => {
          const existing = getExisting(docType.value)
          const isUploading = uploading === docType.value

          return (
            <div key={docType.value} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {docType.label}
                      {docType.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </p>
                    {existing ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        {statusIcon(existing.status)}
                        {statusBadge(existing.status)}
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {existing.original_filename || "file"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Not uploaded</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {existing?.file_url && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={existing.file_url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                  <Button
                    variant={existing?.status === "rejected" ? "outline" : "outline"}
                    size="sm"
                    onClick={() => inputRefs.current[docType.value]?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {existing?.status === "rejected"
                      ? "Re-upload"
                      : existing
                        ? "Update"
                        : "Upload"}
                  </Button>
                  <input
                    ref={(el) => { inputRefs.current[docType.value] = el }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(docType.value, file)
                    }}
                  />
                </div>
              </div>

              {existing?.status === "rejected" && existing.rejection_reason && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <span className="font-medium">Rejection reason:</span>{" "}
                  {existing.rejection_reason}
                </div>
              )}

              {existing?.verified_at && existing.status === "approved" && (
                <p className="text-xs text-muted-foreground">
                  Verified on{" "}
                  {new Date(existing.verified_at).toLocaleDateString("en-NP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
