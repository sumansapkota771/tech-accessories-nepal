import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { VendorOnboardingForm } from "@/components/vendor/vendor-onboarding-form"
import { VendorApplicationStatus } from "@/components/vendor/vendor-application-status"
import { createClient } from "@/lib/supabase/server"

export default async function VendorOnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/vendor/onboarding")
  }

  const { data: vendor } = await supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle()

  if (vendor?.status === "approved") {
    redirect("/vendor")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Become a Seller</h1>
            <p className="text-muted-foreground">Set up your store to start selling on the marketplace.</p>
          </div>

          {vendor ? <VendorApplicationStatus vendor={vendor} /> : <VendorOnboardingForm userId={user.id} email={user.email || ""} fullName={user.user_metadata?.full_name} phone={user.user_metadata?.phone} existingVendor={vendor} />}
        </div>
      </main>
      <Footer />
    </div>
  )
}
