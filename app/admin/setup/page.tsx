import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

async function makeAdmin(formData: FormData) {
  "use server"

  const supabase = await createClient()
  const email = formData.get("email") as string

  if (!email) {
    return
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user || userError) {
    redirect("/auth/login")
  }

  // SECURITY: Check if any admin already exists — bootstrap is one-time only
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")

  if (count && count > 0) {
    // Admin already exists — cannot bootstrap again
    redirect("/admin")
  }

  // Verify the email matches the authenticated user
  if (user.email !== email) {
    return
  }

  const { error: insertError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      role: "admin",
    })

  if (insertError) {
    console.error("Error creating admin:", insertError)
    return
  }

  redirect("/admin")
}

export default async function AdminSetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    redirect("/auth/login")
  }

  // Check if any admin already exists
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")

  if (count && count > 0) {
    // Admin already exists — redirect to admin dashboard
    redirect("/admin")
  }

  // Check if this user's profile exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profileError && profile?.role === "admin") {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>
            {profileError
              ? "Database setup required. Click below to create the first admin account."
              : "No admin user exists yet. Set up the first admin account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={makeAdmin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Your Email (must match your account)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={user.email || ""}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
                readOnly
              />
            </div>
            <Button type="submit" className="w-full">
              Make Me Admin
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            This page is only available when no admin account exists.
            After the first admin is created, this page will no longer be accessible.
          </p>
          {profileError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Database Setup Required:</strong> Please run the SQL scripts in your Supabase project first.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
