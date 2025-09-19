import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Category } from "@/lib/types"
import { mockCategories } from "@/lib/mock-data"

export async function CategoriesSection() {
  // Try to fetch from Supabase, fallback to mock data
  let categories: Category[] = []
  
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    const { data, error } = await supabase.from("categories").select("*").limit(6)

    if (error) {
      console.error("Error fetching categories:", error)
      categories = mockCategories.slice(0, 6)
    } else {
      categories = data || []
    }
  } catch (error) {
    console.error("Supabase connection error:", error)
    categories = mockCategories.slice(0, 6)
  }

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-4">Shop by Category</h2>
          <p className="text-muted-foreground text-pretty max-w-2xl mx-auto">
            Find exactly what you need from our carefully curated categories of premium tech accessories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {categories?.map((category: Category) => (
            <Link key={category.id} href={`/categories/${category.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="aspect-square rounded-full bg-primary/10 mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <img
                      src={category.image_url || "/placeholder.svg?height=80&width=80"}
                      alt={category.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-sm text-center group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/categories">
              View All Categories <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
