"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface WishlistButtonProps {
  productId: string
  size?: "icon" | "default" | "sm" | "lg"
  variant?: "ghost" | "outline"
  className?: string
}

export function WishlistButton({ productId, size = "icon", variant = "ghost", className }: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false

    async function checkWishlist() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle()

      if (!cancelled) setIsWishlisted(!!data)
    }

    checkWishlist()
    return () => {
      cancelled = true
    }
  }, [productId, supabase])

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to save items to your wishlist.",
          variant: "destructive",
        })
        return
      }

      if (isWishlisted) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId)
        if (error) throw error
        setIsWishlisted(false)
        toast({ title: "Removed from wishlist" })
      } else {
        const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId })
        if (error) throw error
        setIsWishlisted(true)
        toast({ title: "Added to wishlist" })
      }
    } catch (error) {
      console.error("Error updating wishlist:", error)
      toast({ title: "Error", description: "Failed to update wishlist.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={toggleWishlist} disabled={loading} className={className}>
      <Heart className={cn("h-4 w-4", isWishlisted && "fill-destructive text-destructive")} />
    </Button>
  )
}
