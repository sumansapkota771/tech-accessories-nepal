import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Truck, Headphones } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-balance leading-tight">
                Premium Tech Accessories for <span className="text-primary">Modern Life</span>
              </h1>
              <p className="text-xl text-muted-foreground text-pretty max-w-2xl">
                Discover the latest in tech accessories from trusted brands. Phone cases, chargers, headphones, and more
                - all at competitive prices with fast delivery across Nepal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="text-lg px-8">
                <Link href="/products">
                  Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-lg px-8 bg-transparent">
                <Link href="/featured">View Featured</Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Quality Guaranteed</p>
                  <p className="text-xs text-muted-foreground">Authentic products only</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Fast Delivery</p>
                  <p className="text-xs text-muted-foreground">Same day in Kathmandu</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Headphones className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">24/7 Support</p>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-8 flex items-center justify-center">
              <img
                src="/placeholder-ivg3m.png"
                alt="Tech Accessories Collection"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            {/* Floating Cards */}
            <div className="absolute -top-4 -left-4 bg-card border rounded-lg p-3 shadow-lg">
              <p className="text-sm font-semibold">1000+ Products</p>
              <p className="text-xs text-muted-foreground">In Stock</p>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-card border rounded-lg p-3 shadow-lg">
              <p className="text-sm font-semibold">5000+ Customers</p>
              <p className="text-xs text-muted-foreground">Trust Us</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
