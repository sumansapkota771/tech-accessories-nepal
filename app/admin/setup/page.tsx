import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

async function makeAdmin(formData: FormData) {
  "use server"

  const supabase = await createClient()
  const email = formData.get("email") as string

  if (!email) {
    console.error("No email provided")
    return
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user || userError) {
    console.error("User not authenticated:", userError)
    return
  }

  console.log("Attempting to make user admin:", user.id, email)

  // First, try to create the profile if it doesn't exist
  const { error: insertError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      role: "admin"
    })

  if (insertError) {
    console.error("Error creating/updating profile:", insertError)
    return
  }

  console.log("Successfully made user admin")
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

  // Check if profiles table exists and if user is already admin
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
            {profileError ? 
              "Database setup required. Click below to create admin account." : 
              "No admin user exists. Set up the first admin account."
            }
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
