"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-sm font-medium text-primary">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex gap-4">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
