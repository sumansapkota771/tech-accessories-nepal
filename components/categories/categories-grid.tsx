import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import type { Category } from "@/lib/types"

interface CategoriesGridProps {
  categories: Category[]
}

export async function CategoriesGrid({ categories }: CategoriesGridProps) {
  const supabase = await createClient()

  // Get product counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id)
        .eq("is_active", true)

      return {
        ...category,
        productCount: count || 0,
      }
    }),
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categoriesWithCounts.map((category) => (
        <Link key={category.id} href={`/categories/${category.id}`}>
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="aspect-square rounded-lg bg-muted mb-4 overflow-hidden">
                <img
                  src={category.image_url || "/placeholder.svg?height=200&width=200"}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{category.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {category.productCount}
                  </Badge>
                </div>

                {category.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
