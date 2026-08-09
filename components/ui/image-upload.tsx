"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Upload, X, Loader2 } from "lucide-react"

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

interface ImageUploadProps {
  label?: string
  value: string
  onChange: (url: string) => void
  folder?: string
  bucket?: string
}

export function ImageUpload({ label = "Image", value, onChange, folder = "", bucket = "images" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const supabase = createClient()
  const { toast } = useToast()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a JPG, PNG, WEBP, or GIF image.",
        variant: "destructive",
      })
      setInputKey((k) => k + 1)
      return
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Images must be under 5MB.", variant: "destructive" })
      setInputKey((k) => k + 1)
      return
    }

    setUploading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be signed in to upload images.")

      const ext = file.name.split(".").pop()
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `${user.id}/${folder ? `${folder}/` : ""}${uniqueName}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(publicUrlData.publicUrl)
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setInputKey((k) => k + 1)
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative h-20 w-20 shrink-0 rounded-md overflow-hidden border bg-muted">
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/90 border flex items-center justify-center hover:bg-background"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <Input
            key={inputKey}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
            </p>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, or GIF. Max 5MB.</p>
        </div>
      </div>
    </div>
  )
}
