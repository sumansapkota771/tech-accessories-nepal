import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-8 flex gap-4">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
