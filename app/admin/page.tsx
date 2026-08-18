import { getAuthUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (user.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminDashboard />
    </div>
  )
}
