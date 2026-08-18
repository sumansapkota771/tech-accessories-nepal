import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CategoryProducts } from "@/components/categories/category-products"
import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: category } = await supabase.from("categories").select("name, description").eq("id", id).single()

  if (!category) return { title: "Category Not Found" }

  return {
    title: `${category.name} - Tech Accessories Nepal`,
    description: category.description?.slice(0, 160) || `Browse ${category.name} products at Tech Accessories Nepal.`,
  }
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
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 py-4">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/categories" className="hover:text-primary transition-colors">Categories</Link>
              </li>
              <li>/</li>
              <li className="text-foreground">{category.name}</li>
            </ol>
          </nav>
        </div>

        <div className="container mx-auto px-4 pb-8">
          {/* Category Header */}
          <div className="mb-8">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
                <Image
                  src={category.image_url || "/placeholder.svg?height=80&width=80"}
                  alt={category.name}
                  fill
                  sizes="80px"
                  className="object-cover"
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
