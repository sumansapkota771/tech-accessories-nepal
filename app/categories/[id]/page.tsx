import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CategoryProducts } from "@/components/categories/category-products"
import { createClient } from "@/lib/supabase/server"

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category, error } = await supabase.from("categories").select("*").eq("id", id).single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Category Header */}
          <div className="mb-8">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img
                  src={category.image_url || "/placeholder.svg?height=80&width=80"}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
                {category.description && <p className="text-muted-foreground">{category.description}</p>}
              </div>
            </div>
          </div>

          <CategoryProducts categoryId={category.id} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
