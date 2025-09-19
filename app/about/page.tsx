import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Truck, Headphones, Award, Users, MapPin } from "lucide-react"

export default function AboutPage() {
  const features = [
    {
      icon: Shield,
      title: "Quality Assurance",
      description: "All products are authentic and come with manufacturer warranty",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same day delivery in Kathmandu Valley, nationwide shipping available",
    },
    {
      icon: Headphones,
      title: "Customer Support",
      description: "Dedicated support team available 24/7 to help you",
    },
    {
      icon: Award,
      title: "Best Prices",
      description: "Competitive pricing with regular discounts and special offers",
    },
  ]

  const stats = [
    { label: "Happy Customers", value: "5,000+" },
    { label: "Products Sold", value: "15,000+" },
    { label: "Years in Business", value: "3+" },
    { label: "Partner Brands", value: "50+" },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-balance mb-6">About Tech Accessories Nepal</h1>
              <p className="text-xl text-muted-foreground text-pretty">
                Your trusted partner for premium tech accessories in Nepal. We're committed to bringing you the latest
                and greatest in mobile accessories, audio gear, and tech essentials at competitive prices.
              </p>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Founded in 2021, Tech Accessories Nepal started with a simple mission: to make premium tech
                    accessories accessible to everyone in Nepal. What began as a small online store has grown into the
                    country's leading destination for mobile accessories and tech gear.
                  </p>
                  <p>
                    We understand the frustration of finding quality tech accessories in Nepal. That's why we've
                    partnered with trusted brands and suppliers worldwide to bring you authentic products at competitive
                    prices, backed by excellent customer service.
                  </p>
                  <p>
                    Today, we serve thousands of customers across Nepal, from tech enthusiasts to everyday users looking
                    for reliable accessories for their devices. Our commitment to quality, authenticity, and customer
                    satisfaction remains at the heart of everything we do.
                  </p>
                </div>
              </div>
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-8 flex items-center justify-center">
                <img
                  src="/placeholder.svg?height=400&width=400"
                  alt="Tech Accessories Nepal Story"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Choose Us?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're more than just an online store. We're your trusted partner in finding the perfect tech
                accessories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center border-0 shadow-sm">
                  <CardContent className="p-6">
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

        {/* Our Mission */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Our Mission & Values</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Customer First</h3>
                    <p className="text-sm text-muted-foreground">
                      Every decision we make is centered around providing the best experience for our customers.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Quality Promise</h3>
                    <p className="text-sm text-muted-foreground">
                      We only sell authentic products from trusted brands, backed by proper warranties.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Local Focus</h3>
                    <p className="text-sm text-muted-foreground">
                      We understand the Nepali market and tailor our services to meet local needs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                Have questions or need help finding the right product? We're here to help!
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Customer Support</h3>
                    <p className="text-sm text-muted-foreground mb-2">Available 24/7</p>
                    <p className="text-sm">+977-1-4567890</p>
                    <p className="text-sm">support@techaccessoriesnepal.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Business Inquiries</h3>
                    <p className="text-sm text-muted-foreground mb-2">Partnerships & Wholesale</p>
                    <p className="text-sm">+977-1-4567891</p>
                    <p className="text-sm">business@techaccessoriesnepal.com</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
