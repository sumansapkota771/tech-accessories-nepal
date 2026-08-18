"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { submitVendorApplication } from "@/lib/actions/vendors"
import type { Vendor } from "@/lib/types"
import {
  User,
  Store,
  MapPin,
  FileText,
  Truck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Upload,
  Loader2,
} from "lucide-react"

interface VendorOnboardingFormProps {
  userId: string
  email: string
  fullName?: string
  phone?: string
  existingVendor?: Vendor | null
}

interface DeliveryAreaInput {
  value: string
}

const STEP_LABELS = [
  { label: "Personal Information", icon: User },
  { label: "Store Information", icon: Store },
  { label: "Business Address", icon: MapPin },
  { label: "Tax & Documents", icon: FileText },
  { label: "Delivery Setup", icon: Truck },
  { label: "Review & Submit", icon: CheckCircle },
]

const DELIVERY_TIME_OPTIONS = [
  "Same day",
  "1-2 days",
  "2-3 days",
  "3-5 days",
  "5-7 days",
  "Custom",
]

const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE = 5 * 1024 * 1024

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

interface FormData {
  fullName: string
  email: string
  phone: string
  location: string
  storeName: string
  storeSlug: string
  storeDescription: string
  businessAddress: string
  panNumber: string
  panFile: File | null
  panFileUrl: string
  vatNumber: string
  vatFile: File | null
  vatFileUrl: string
  businessRegistrationNumber: string
  selfDeliveryConfirmed: boolean
  deliveryAreas: string[]
  deliveryAreaInput: string
  deliveryCharge: number
  estimatedDeliveryTime: string
  freeDeliveryThreshold: number
  termsAccepted: boolean
}

function buildInitialData(
  email: string,
  fullName: string | undefined,
  phone: string | undefined,
  existingVendor: Vendor | null | undefined,
): FormData {
  if (existingVendor) {
    return {
      fullName: existingVendor.full_name || fullName || "",
      email,
      phone: existingVendor.phone || phone || "",
      location: existingVendor.location || "",
      storeName: existingVendor.store_name || "",
      storeSlug: existingVendor.slug || "",
      storeDescription: existingVendor.description || "",
      businessAddress: existingVendor.address || "",
      panNumber: existingVendor.pan_number || "",
      panFile: null,
      panFileUrl: existingVendor.pan_file_url || "",
      vatNumber: existingVendor.vat_number || "",
      vatFile: null,
      vatFileUrl: existingVendor.vat_file_url || "",
      businessRegistrationNumber:
        existingVendor.business_registration_number || "",
      selfDeliveryConfirmed: existingVendor.self_delivery_confirmed || false,
      deliveryAreas: existingVendor.delivery_areas || [],
      deliveryAreaInput: "",
      deliveryCharge: existingVendor.delivery_charge ?? 0,
      estimatedDeliveryTime:
        existingVendor.estimated_delivery_time || "2-3 days",
      freeDeliveryThreshold:
        existingVendor.free_delivery_threshold ?? 0,
      termsAccepted: false,
    }
  }

  return {
    fullName: fullName || "",
    email,
    phone: phone || "",
    location: "",
    storeName: "",
    storeSlug: "",
    storeDescription: "",
    businessAddress: "",
    panNumber: "",
    panFile: null,
    panFileUrl: "",
    vatNumber: "",
    vatFile: null,
    vatFileUrl: "",
    businessRegistrationNumber: "",
    selfDeliveryConfirmed: false,
    deliveryAreas: [],
    deliveryAreaInput: "",
    deliveryCharge: 0,
    estimatedDeliveryTime: "2-3 days",
    freeDeliveryThreshold: 0,
    termsAccepted: false,
  }
}

function FileUploadField({
  label,
  required,
  file,
  fileUrl,
  onFileChange,
  onRemove,
  uploading,
}: {
  label: string
  required?: boolean
  file: File | null
  fileUrl: string
  onFileChange: (file: File) => void
  onRemove: () => void
  uploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasFile = !!file || !!fileUrl

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
      alert("Only PDF, JPG, and PNG files are allowed.")
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      alert("File must be under 5 MB.")
      return
    }
    onFileChange(selected)
  }

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        className="hidden"
      />
      {hasFile ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">
            {file ? file.name : fileUrl.split("/").pop() || "Uploaded file"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={uploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <Upload className="h-4 w-4" />
          Click to upload (PDF, JPG, PNG — max 5 MB)
        </button>
      )}
    </div>
  )
}

export function VendorOnboardingForm({
  userId,
  email,
  fullName,
  phone,
  existingVendor,
}: VendorOnboardingFormProps) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(() =>
    buildInitialData(email, fullName, phone, existingVendor),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPan, setUploadingPan] = useState(false)
  const [uploadingVat, setUploadingVat] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (step === 1 && formData.storeName && !existingVendor?.slug) {
      setFormData((prev) => ({
        ...prev,
        storeSlug: slugify(prev.storeName),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.storeName, step])

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function uploadFile(
    file: File,
    bucket: string,
    folder: string,
  ): Promise<string | null> {
    const ext = file.name.split(".").pop()
    const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })

    if (error) {
      console.error("Upload error:", error)
      return null
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleFileUpload(
    file: File,
    type: "pan" | "vat",
  ): Promise<string | null> {
    if (type === "pan") setUploadingPan(true)
    else setUploadingVat(true)

    try {
      const url = await uploadFile(file, "documents", type)
      return url
    } finally {
      if (type === "pan") setUploadingPan(false)
      else setUploadingVat(false)
    }
  }

  function addDeliveryArea() {
    const area = formData.deliveryAreaInput.trim()
    if (!area) return
    if (formData.deliveryAreas.includes(area)) {
      updateField("deliveryAreaInput", "")
      return
    }
    updateField("deliveryAreas", [...formData.deliveryAreas, area])
    updateField("deliveryAreaInput", "")
  }

  function removeDeliveryArea(area: string) {
    updateField(
      "deliveryAreas",
      formData.deliveryAreas.filter((a) => a !== area),
    )
  }

  function handleDeliveryAreaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addDeliveryArea()
    }
  }

  function validateStep(s: number): string | null {
    switch (s) {
      case 0:
        if (!formData.fullName.trim()) return "Full name is required."
        if (!formData.phone.trim()) return "Phone number is required."
        if (!formData.location.trim()) return "Location is required."
        return null
      case 1:
        if (!formData.storeName.trim()) return "Store name is required."
        if (!formData.storeSlug.trim()) return "Store URL slug is required."
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.storeSlug)
        )
          return "Slug must be lowercase alphanumeric with hyphens."
        return null
      case 2:
        if (!formData.businessAddress.trim())
          return "Business address is required."
        return null
      case 3:
        if (!formData.panNumber.trim()) return "PAN number is required."
        if (!formData.panFile && !formData.panFileUrl)
          return "PAN document is required."
        if (
          formData.vatNumber.trim() &&
          !formData.vatFile &&
          !formData.vatFileUrl
        )
          return "Please upload the VAT document or remove the VAT number."
        return null
      case 4:
        if (!formData.selfDeliveryConfirmed)
          return "You must confirm self-delivery to proceed."
        if (formData.deliveryAreas.length === 0)
          return "Add at least one delivery area."
        return null
      case 5:
        if (!formData.termsAccepted)
          return "You must accept the terms to submit."
        return null
      default:
        return null
    }
  }

  function goNext() {
    const error = validateStep(step)
    if (error) {
      toast({ title: "Validation error", description: error, variant: "destructive" })
      return
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    const error = validateStep(5)
    if (error) {
      toast({ title: "Validation error", description: error, variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      let panUrl = formData.panFileUrl
      if (formData.panFile && !panUrl) {
        const url = await handleFileUpload(formData.panFile, "pan")
        if (!url) {
          toast({ title: "Upload failed", description: "Failed to upload PAN document.", variant: "destructive" })
          setIsLoading(false)
          return
        }
        panUrl = url
      }

      let vatUrl = formData.vatFileUrl
      if (formData.vatFile && !vatUrl) {
        const url = await handleFileUpload(formData.vatFile, "vat")
        if (!url) {
          toast({ title: "Upload failed", description: "Failed to upload VAT document.", variant: "destructive" })
          setIsLoading(false)
          return
        }
        vatUrl = url
      }

      const baseSlug = slugify(formData.storeName)
      const slug = formData.storeSlug || (baseSlug ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : `store-${Date.now()}`)

      const result = await submitVendorApplication({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        store_name: formData.storeName,
        slug,
        description: formData.storeDescription || undefined,
        address: formData.businessAddress,
        pan_number: formData.panNumber,
        pan_file_url: panUrl,
        vat_number: formData.vatNumber || undefined,
        vat_file_url: vatUrl || undefined,
        business_registration_number:
          formData.businessRegistrationNumber || undefined,
        self_delivery_confirmed: formData.selfDeliveryConfirmed,
        delivery_areas: formData.deliveryAreas,
        delivery_charge: formData.deliveryCharge,
        estimated_delivery_time: formData.estimatedDeliveryTime || undefined,
        free_delivery_threshold: formData.freeDeliveryThreshold,
      })

      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to submit application.", variant: "destructive" })
        setIsLoading(false)
        return
      }

      toast({
        title: "Application submitted",
        description: "We'll review your store and notify you once it's approved.",
      })
      router.refresh()
    } catch (err) {
      console.error("Error submitting vendor application:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const totalSteps = STEP_LABELS.length
  const progress = ((step + 1) / totalSteps) * 100

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Seller Onboarding</CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </span>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-1">
          {STEP_LABELS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isComplete = i < step
            return (
              <div
                key={s.label}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                }`}
                title={s.label}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline truncate">{s.label}</span>
              </div>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {/* Step 0: Personal Information */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Ram Bahadur Thapa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={formData.email}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="98XXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                Location / City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Kathmandu"
              />
            </div>
          </div>
        )}

        {/* Step 1: Store Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="storeName"
                value={formData.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                placeholder="Tech Accessories Nepal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeSlug">Store URL</Label>
              <div className="flex items-center gap-0">
                <span className="rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">
                  /store/
                </span>
                <Input
                  id="storeSlug"
                  value={formData.storeSlug}
                  onChange={(e) =>
                    updateField(
                      "storeSlug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/--+/g, "-"),
                    )
                  }
                  className="rounded-l-none"
                  placeholder="tech-accessories-nepal"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-generated from store name. Only lowercase letters, numbers,
                and hyphens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeDescription">Store Description</Label>
              <Textarea
                id="storeDescription"
                value={formData.storeDescription}
                onChange={(e) =>
                  updateField("storeDescription", e.target.value)
                }
                placeholder="Tell customers what you sell and why they should shop from you..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 2: Business Address */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessAddress">
                Business Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) =>
                  updateField("businessAddress", e.target.value)
                }
                placeholder="New Baneshwor, Kathmandu 44600"
              />
              <p className="text-xs text-muted-foreground">
                Full street address including ward number and district. This
                will be used for business verification.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Tax & Business Documents */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="panNumber">
                PAN Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => updateField("panNumber", e.target.value)}
                placeholder="123456789"
              />
            </div>

            <FileUploadField
              label="PAN Document"
              required
              file={formData.panFile}
              fileUrl={formData.panFileUrl}
              uploading={uploadingPan}
              onFileChange={async (file) => {
                updateField("panFile", file)
                const url = await handleFileUpload(file, "pan")
                if (url) {
                  updateField("panFileUrl", url)
                  updateField("panFile", null)
                }
              }}
              onRemove={() => {
                updateField("panFile", null)
                updateField("panFileUrl", "")
              }}
            />

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(e) => updateField("vatNumber", e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {formData.vatNumber.trim() && (
                <FileUploadField
                  label="VAT Document"
                  file={formData.vatFile}
                  fileUrl={formData.vatFileUrl}
                  uploading={uploadingVat}
                  onFileChange={async (file) => {
                    updateField("vatFile", file)
                    const url = await handleFileUpload(file, "vat")
                    if (url) {
                      updateField("vatFileUrl", url)
                      updateField("vatFile", null)
                    }
                  }}
                  onRemove={() => {
                    updateField("vatFile", null)
                    updateField("vatFileUrl", "")
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessReg">
                Business Registration Number
              </Label>
              <Input
                id="businessReg"
                value={formData.businessRegistrationNumber}
                onChange={(e) =>
                  updateField("businessRegistrationNumber", e.target.value)
                }
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {/* Step 4: Self-Delivery Confirmation */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <Checkbox
                id="selfDelivery"
                checked={formData.selfDeliveryConfirmed}
                onCheckedChange={(checked) =>
                  updateField("selfDeliveryConfirmed", checked === true)
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="selfDelivery"
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                I agree to fulfill orders using self-delivery using my own
                logistics.
              </Label>
            </div>

            {formData.selfDeliveryConfirmed && (
              <div className="space-y-4 rounded-md border border-border p-4 bg-muted/30">
                <div className="space-y-2">
                  <Label>
                    Delivery Areas{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.deliveryAreaInput}
                      onChange={(e) =>
                        updateField("deliveryAreaInput", e.target.value)
                      }
                      onKeyDown={handleDeliveryAreaKeyDown}
                      placeholder="Type an area and press Enter (e.g. Kathmandu)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addDeliveryArea}
                    >
                      Add
                    </Button>
                  </div>
                  {formData.deliveryAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.deliveryAreas.map((area) => (
                        <Badge
                          key={area}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => removeDeliveryArea(area)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Areas where you can deliver using your own logistics.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCharge">
                      Delivery Charge (Rs.)
                    </Label>
                    <Input
                      id="deliveryCharge"
                      type="number"
                      min={0}
                      value={formData.deliveryCharge}
                      onChange={(e) =>
                        updateField(
                          "deliveryCharge",
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Delivery Time</Label>
                    <Select
                      value={formData.estimatedDeliveryTime}
                      onValueChange={(val) =>
                        updateField("estimatedDeliveryTime", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeThreshold">
                    Free Delivery Threshold (Rs.)
                  </Label>
                  <Input
                    id="freeThreshold"
                    type="number"
                    min={0}
                    value={formData.freeDeliveryThreshold}
                    onChange={(e) =>
                      updateField(
                        "freeDeliveryThreshold",
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Orders above this amount get free delivery. Set to 0 for no
                    free delivery.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-5">
            <ReviewSection title="Personal Information" onEdit={() => setStep(0)}>
              <ReviewRow label="Full Name" value={formData.fullName} />
              <ReviewRow label="Email" value={formData.email} />
              <ReviewRow label="Phone" value={formData.phone} />
              <ReviewRow label="Location" value={formData.location} />
            </ReviewSection>

            <ReviewSection title="Store Information" onEdit={() => setStep(1)}>
              <ReviewRow label="Store Name" value={formData.storeName} />
              <ReviewRow
                label="Store URL"
                value={`/store/${formData.storeSlug}`}
              />
              {formData.storeDescription && (
                <ReviewRow
                  label="Description"
                  value={formData.storeDescription}
                />
              )}
            </ReviewSection>

            <ReviewSection title="Business Address" onEdit={() => setStep(2)}>
              <ReviewRow label="Address" value={formData.businessAddress} />
            </ReviewSection>

            <ReviewSection
              title="Tax & Documents"
              onEdit={() => setStep(3)}
            >
              <ReviewRow label="PAN Number" value={formData.panNumber} />
              <ReviewRow
                label="PAN Document"
                value={
                  formData.panFile
                    ? formData.panFile.name
                    : formData.panFileUrl
                      ? "Uploaded"
                      : "Not uploaded"
                }
              />
              {formData.vatNumber && (
                <ReviewRow label="VAT Number" value={formData.vatNumber} />
              )}
              {formData.vatNumber && (
                <ReviewRow
                  label="VAT Document"
                  value={
                    formData.vatFile
                      ? formData.vatFile.name
                      : formData.vatFileUrl
                        ? "Uploaded"
                        : "Not uploaded"
                  }
                />
              )}
              {formData.businessRegistrationNumber && (
                <ReviewRow
                  label="Business Reg. Number"
                  value={formData.businessRegistrationNumber}
                />
              )}
            </ReviewSection>

            <ReviewSection
              title="Delivery Setup"
              onEdit={() => setStep(4)}
            >
              <ReviewRow
                label="Self-Delivery"
                value={formData.selfDeliveryConfirmed ? "Confirmed" : "No"}
              />
              {formData.selfDeliveryConfirmed && (
                <>
                  <ReviewRow
                    label="Delivery Areas"
                    value={formData.deliveryAreas.join(", ") || "None"}
                  />
                  <ReviewRow
                    label="Delivery Charge"
                    value={`Rs. ${formData.deliveryCharge}`}
                  />
                  <ReviewRow
                    label="Est. Delivery Time"
                    value={formData.estimatedDeliveryTime}
                  />
                  <ReviewRow
                    label="Free Delivery Threshold"
                    value={
                      formData.freeDeliveryThreshold > 0
                        ? `Rs. ${formData.freeDeliveryThreshold}`
                        : "None"
                    }
                  />
                </>
              )}
            </ReviewSection>

            <div className="border-t border-border pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) =>
                    updateField("termsAccepted", checked === true)
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="termsAccepted"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <span className="font-medium underline underline-offset-2">
                    Marketplace Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="font-medium underline underline-offset-2">
                    Seller Agreement
                  </span>
                  .
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 0 || isLoading}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < totalSteps - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={isLoading}
              className="gap-1.5"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !formData.termsAccepted}
              className="gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 text-xs text-muted-foreground hover:text-primary"
        >
          Edit
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}
