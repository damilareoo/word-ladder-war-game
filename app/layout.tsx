import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

// Define a hardcoded production URL
const PRODUCTION_URL = "https://word-ladder-war.vercel.app"

export const metadata: Metadata = {
  title: "Word Ladder War",
  description: "A fast-paced word game where you form words from a single word",
  metadataBase: new URL(PRODUCTION_URL),
  openGraph: {
    title: "Word Ladder War",
    description: "A fast-paced word game where you form words from a single word",
    images: [
      {
        url: "/site-image.png",
        width: 1200,
        height: 630,
        alt: "Word Ladder War",
      },
    ],
    type: "website",
    siteName: "Word Ladder War",
  },
  twitter: {
    card: "summary_large_image",
    title: "Word Ladder War",
    description: "A fast-paced word game where you form words from a single word",
    images: ["/site-image.png"],
    creator: "@damilare_oo",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Add explicit Open Graph tags to ensure they work */}
        <meta property="og:title" content="Word Ladder War" />
        <meta property="og:description" content="A fast-paced word game where you form words from a single word" />
        <meta property="og:image" content={`${PRODUCTION_URL}/site-image.png`} />
        <meta property="og:url" content={PRODUCTION_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Word Ladder War" />

        {/* Add explicit Twitter card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Word Ladder War" />
        <meta name="twitter:description" content="A fast-paced word game where you form words from a single word" />
        <meta name="twitter:image" content={`${PRODUCTION_URL}/site-image.png`} />
        <meta name="twitter:creator" content="@damilare_oo" />

        {/* Mobile optimizations */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#18181b" />
      </head>
      <body className={inter.className}>
        <Suspense>{children}</Suspense>
        <Analytics debug={process.env.NODE_ENV !== "production"} />
      </body>
    </html>
  )
}
