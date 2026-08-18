import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/sections/hero-section"
import { FeaturedProducts } from "@/components/sections/featured-products"
import { BestSellers } from "@/components/sections/best-sellers"
import { NewArrivals } from "@/components/sections/new-arrivals"
import { DealsSection } from "@/components/sections/deals-section"
import { CategoriesSection } from "@/components/sections/categories-section"
import { WhyChooseUs } from "@/components/sections/why-choose-us"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tech Accessories Nepal - Shop Premium Tech Accessories",
  description:
    "Discover premium tech accessories at Tech Accessories Nepal. Phone cases, chargers, headphones, laptop accessories, gaming gear and more. Free shipping on orders over Rs. 5000.",
  openGraph: {
    title: "Tech Accessories Nepal - Shop Premium Tech Accessories",
    description:
      "Discover premium tech accessories at Tech Accessories Nepal. Phone cases, chargers, headphones, laptop accessories, gaming gear and more.",
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <CategoriesSection />
        <BestSellers />
        <DealsSection />
        <NewArrivals />
        <WhyChooseUs />
      </main>
      <Footer />
    </div>
  )
}
