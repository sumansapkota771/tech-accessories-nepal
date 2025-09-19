import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/sections/hero-section"
import { FeaturedProducts } from "@/components/sections/featured-products"
import { CategoriesSection } from "@/components/sections/categories-section"
import { WhyChooseUs } from "@/components/sections/why-choose-us"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <CategoriesSection />
        <WhyChooseUs />
      </main>
      <Footer />
    </div>
  )
}
