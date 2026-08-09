import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { config as fontAwesomeConfig } from "@fortawesome/fontawesome-svg-core"
import "@fortawesome/fontawesome-svg-core/styles.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"

// We import the CSS ourselves above, so stop the library from injecting its
// own <style> tag at runtime (that both duplicates it and causes a flash of
// oversized icons on first paint under Next.js SSR).
fontAwesomeConfig.autoAddCss = false

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Tech Accessories Nepal - Premium Tech Accessories Store",
  description:
    "Your trusted source for premium tech accessories in Nepal. Phone cases, chargers, headphones, and more.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#92278f",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
