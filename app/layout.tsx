import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

// Define a hardcoded production URL - replace with your actual production URL
const PRODUCTION_URL = "https://word-ladder-war.vercel.app"

export const metadata: Metadata = {
  title: "Word Ladder War",
  description: "A fast-paced word game where you form words from a single word",
  // Use a hardcoded URL instead of relying on environment variables
  metadataBase: new URL(PRODUCTION_URL),
  openGraph: {
    title: "Word Ladder War",
    description: "A fast-paced word game where you form words from a single word",
    images: [
      {
        url: "/api/og", // Use the dynamic OG image route
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
    images: ["/api/og"], // Use the dynamic OG image route
    creator: "@damilare_oo",
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
        <meta property="og:image" content={`${PRODUCTION_URL}/api/og`} />
        <meta property="og:url" content={PRODUCTION_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Word Ladder War" />

        {/* Add explicit Twitter card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Word Ladder War" />
        <meta name="twitter:description" content="A fast-paced word game where you form words from a single word" />
        <meta name="twitter:image" content={`${PRODUCTION_URL}/api/og`} />
        <meta name="twitter:creator" content="@damilare_oo" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
