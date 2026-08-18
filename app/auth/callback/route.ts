import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ALLOWED_REDIRECT_PATHS = [
  "/",
  "/products",
  "/categories",
  "/account",
  "/account/orders",
  "/account/profile",
  "/account/wishlist",
  "/vendor",
  "/vendor/onboarding",
]

function isSafeRedirect(next: string): boolean {
  // Only allow absolute paths that start with / and don't contain protocol
  if (!next.startsWith("/") || next.startsWith("//") || next.includes(":")) {
    return false
  }
  // Check against whitelist or allow root-level paths
  return (
    ALLOWED_REDIRECT_PATHS.includes(next) ||
    next.startsWith("/products") ||
    next.startsWith("/categories") ||
    next.startsWith("/store")
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectPath = isSafeRedirect(next) ? next : "/"
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
