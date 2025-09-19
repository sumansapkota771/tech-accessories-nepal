import { Shield, Truck, Headphones, CreditCard, RotateCcw, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function WhyChooseUs() {
  const features = [
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "All products are authentic and come with manufacturer warranty",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same day delivery in Kathmandu, nationwide shipping available",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Our customer service team is always ready to help you",
    },
    {
      icon: CreditCard,
      title: "Secure Payment",
      description: "Multiple payment options with secure checkout process",
    },
    {
      icon: RotateCcw,
      title: "Easy Returns",
      description: "Hassle-free returns and exchanges within 7 days",
    },
    {
      icon: Award,
      title: "Best Prices",
      description: "Competitive pricing with regular discounts and offers",
    },
  ]

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-4">Why Choose Tech Accessories Nepal?</h2>
          <p className="text-muted-foreground text-pretty max-w-2xl mx-auto">
            We're committed to providing the best shopping experience with quality products and exceptional service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
