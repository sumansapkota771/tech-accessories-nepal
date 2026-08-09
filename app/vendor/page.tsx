import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VendorDashboard } from "@/components/vendor/vendor-dashboard"

export default async function VendorPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/vendor")
  }

  const { data: vendor } = await supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle()

  if (!vendor || vendor.status !== "approved") {
    redirect("/vendor/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorDashboard vendor={vendor} />
    </div>
  )
}
