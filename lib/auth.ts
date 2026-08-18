import { createServerClient } from "@/lib/supabase/server"

export type UserRole = "user" | "vendor" | "admin"

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

/**
 * Get the authenticated user with their profile role.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as UserRole) ?? "user",
  }
}

/**
 * Require an authenticated user. Throws/redirects if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error("UNAUTHORIZED")
  }
  return user
}

/**
 * Require a specific role. Throws if user doesn't have the role.
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error("FORBIDDEN")
  }
  return user
}

/**
 * Require admin role.
 */
export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("admin")
}

/**
 * Require vendor role.
 */
export async function requireVendor(): Promise<AuthUser> {
  return requireRole("vendor")
}

/**
 * Check if user has a specific role (non-throwing).
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getAuthUser()
  return user?.role === role
}

/**
 * Get the vendor record for the current user (if they are a vendor).
 */
export async function getVendorForUser(userId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("user_id", userId)
    .single()
  return data
}

/**
 * Get the Supabase server client (convenience wrapper).
 */
export async function getSupabase() {
  return createServerClient()
}
