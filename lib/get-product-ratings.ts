// Shared helper for merging real review averages into product listings,
// used by every page that renders a grid of ProductCards.

export interface RatingSummary {
  avg: number
  count: number
}

export async function getProductRatings(
  supabase: any,
  productIds: string[],
): Promise<Map<string, RatingSummary>> {
  const ratings = new Map<string, RatingSummary>()
  if (productIds.length === 0) return ratings

  const { data, error } = await supabase.from("reviews").select("product_id, rating").in("product_id", productIds)

  if (error || !data) return ratings

  const sums = new Map<string, { sum: number; count: number }>()
  for (const row of data as { product_id: string; rating: number }[]) {
    const entry = sums.get(row.product_id) || { sum: 0, count: 0 }
    entry.sum += row.rating
    entry.count += 1
    sums.set(row.product_id, entry)
  }

  for (const [productId, { sum, count }] of sums) {
    ratings.set(productId, { avg: sum / count, count })
  }

  return ratings
}

export function attachRatings<T extends { id: string }>(
  products: T[],
  ratings: Map<string, RatingSummary>,
): (T & { avg_rating?: number; review_count?: number })[] {
  return products.map((product) => {
    const rating = ratings.get(product.id)
    return rating ? { ...product, avg_rating: rating.avg, review_count: rating.count } : product
  })
}
