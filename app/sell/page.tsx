import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Store, TrendingUp, Users, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sell on Tech Accessories Nepal - Become a Vendor",
  description:
    "Join as a vendor and start selling tech accessories on Nepal's leading marketplace. Your own storefront, simple order management, and fair commission.",
}

export default function SellPage() {
  const benefits = [
    {
      icon: Users,
      title: "Reach more customers",
      description: "List your tech accessories in front of every shopper browsing the marketplace.",
    },
    {
      icon: Store,
      title: "Your own storefront",
      description: "Get a branded store page with your logo, banner, and full product catalog.",
    },
    {
      icon: TrendingUp,
      title: "Simple order management",
      description: "Track and fulfill your orders from a dedicated vendor dashboard.",
    },
    {
      icon: ShieldCheck,
      title: "Fair commission",
      description: "Transparent commission on each sale, with no hidden listing fees.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-balance mb-4">Sell tech accessories on our marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join as a vendor and start selling phone cases, chargers, audio gear, and computer accessories to
            customers across Nepal.
          </p>
          <Button size="lg" asChild>
            <Link href="/vendor/onboarding">Become a Seller</Link>
          </Button>
        </div>

        <div className="container mx-auto px-4 pb-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardContent className="p-6 text-center">
                  <benefit.icon className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
