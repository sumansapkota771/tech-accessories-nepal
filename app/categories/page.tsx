import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CategoriesGrid } from "@/components/categories/categories-grid"
import { createClient } from "@/lib/supabase/server"

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error fetching categories:", error)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Product Categories</h1>
            <p className="text-muted-foreground">Browse our complete range of tech accessories by category</p>
          </div>

          <CategoriesGrid categories={categories || []} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
