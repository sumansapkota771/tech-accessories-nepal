import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/sell`, changeFrequency: "monthly", priority: 0.5 },
  ]

  try {
    const supabase = await createClient()

    const [{ data: products }, { data: categories }, { data: vendors }] = await Promise.all([
      supabase.from("products").select("id, updated_at").eq("is_active", true).eq("approval_status", "approved"),
      supabase.from("categories").select("id, updated_at").eq("is_active", true),
      supabase.from("vendors").select("slug, updated_at").eq("status", "approved"),
    ])

    const productRoutes: MetadataRoute.Sitemap = (products || []).map((p) => ({
      url: `${siteUrl}/products/${p.id}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }))

    const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
      url: `${siteUrl}/categories/${c.id}`,
      lastModified: c.updated_at,
      changeFrequency: "weekly",
      priority: 0.6,
    }))

    const storeRoutes: MetadataRoute.Sitemap = (vendors || []).map((v) => ({
      url: `${siteUrl}/store/${v.slug}`,
      lastModified: v.updated_at,
      changeFrequency: "weekly",
      priority: 0.6,
    }))

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...storeRoutes]
  } catch {
    return staticRoutes
  }
}
