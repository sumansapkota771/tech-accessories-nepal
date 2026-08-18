"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Truck } from "lucide-react"
import { updateVendorDeliverySettings } from "@/lib/actions/vendors"
import { useToast } from "@/hooks/use-toast"
import type { Vendor } from "@/lib/types"

interface VendorDeliverySettingsProps {
  vendor: Vendor
}

const DELIVERY_TIME_OPTIONS = [
  "Same day",
  "1-2 days",
  "2-3 days",
  "3-5 days",
  "5-7 days",
  "Custom",
]

export function VendorDeliverySettings({ vendor }: VendorDeliverySettingsProps) {
  const [deliveryAreas, setDeliveryAreas] = useState<string[]>(
    vendor.delivery_areas || []
  )
  const [areaInput, setAreaInput] = useState("")
  const [deliveryCharge, setDeliveryCharge] = useState<string>(
    vendor.delivery_charge != null ? String(vendor.delivery_charge) : "0"
  )
  const [estimatedTime, setEstimatedTime] = useState<string>(
    vendor.estimated_delivery_time || ""
  )
  const [freeThreshold, setFreeThreshold] = useState<string>(
    vendor.free_delivery_threshold != null
      ? String(vendor.free_delivery_threshold)
      : "0"
  )
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  function addArea() {
    const trimmed = areaInput.trim()
    if (!trimmed) return
    if (deliveryAreas.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate", description: "Area already added.", variant: "destructive" })
      setAreaInput("")
      return
    }
    setDeliveryAreas((prev) => [...prev, trimmed])
    setAreaInput("")
  }

  function removeArea(area: string) {
    setDeliveryAreas((prev) => prev.filter((a) => a !== area))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const result = await updateVendorDeliverySettings({
        delivery_areas: deliveryAreas,
        delivery_charge: Number(deliveryCharge) || 0,
        estimated_delivery_time: estimatedTime,
        free_delivery_threshold: Number(freeThreshold) || 0,
      })
      if (!result.success) {
        throw new Error(result.error)
      }
      toast({ title: "Saved", description: "Delivery settings updated." })
    } catch (err) {
      console.error("Error saving delivery settings:", err)
      toast({ title: "Error", description: "Failed to save delivery settings.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Settings
        </CardTitle>
        <CardDescription>
          Configure delivery areas, charges and time estimates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {vendor.self_delivery_confirmed && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <Truck className="h-4 w-4 shrink-0" />
              Self-delivery confirmed
            </div>
          )}

          <div className="space-y-2">
            <Label>Delivery Areas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type area name and press Enter"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addArea()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addArea}>
                Add
              </Button>
            </div>
            {deliveryAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {deliveryAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1 pr-1.5">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeArea(area)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {area}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryCharge">Delivery Charge (Rs.)</Label>
              <Input
                id="deliveryCharge"
                type="number"
                min="0"
                step="1"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeThreshold">Free Delivery Threshold (Rs.)</Label>
              <Input
                id="freeThreshold"
                type="number"
                min="0"
                step="1"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 for no free delivery
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estimated Delivery Time</Label>
            <Select value={estimatedTime} onValueChange={setEstimatedTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select delivery time" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TIME_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Delivery Settings"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
