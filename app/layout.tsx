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
  title: {
    default: "Tech Accessories Nepal - Premium Tech Accessories Store",
    template: "%s | Tech Accessories Nepal",
  },
  description:
    "Your trusted source for premium tech accessories in Nepal. Phone cases, chargers, headphones, laptop accessories, and more. Quality products, competitive prices.",
  keywords: [
    "tech accessories Nepal",
    "phone cases Nepal",
    "laptop accessories",
    "chargers Nepal",
    "headphones Nepal",
    "gaming accessories",
    "Nepal online store",
  ],
  authors: [{ name: "Tech Accessories Nepal" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Tech Accessories Nepal",
    title: "Tech Accessories Nepal - Premium Tech Accessories Store",
    description:
      "Your trusted source for premium tech accessories in Nepal. Quality products, competitive prices, and excellent customer service.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tech Accessories Nepal",
    description:
      "Your trusted source for premium tech accessories in Nepal.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
    <html lang="en" suppressHydrationWarning>
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
