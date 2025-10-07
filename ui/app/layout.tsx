import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "ReelRecipes - Importeer recepten van Instagram",
  description: "Bewaar en organiseer je favoriete recepten van Instagram reels",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        {/* Global footer with legal links */}
        <footer className="border-t border-border/40 bg-background/80">
          <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()} ReelRecipes</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="underline hover:text-foreground">Privacy</a>
              <a href="/data-deletion" className="underline hover:text-foreground">Gegevensverwijdering</a>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
