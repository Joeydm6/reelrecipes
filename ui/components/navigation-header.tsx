"use client"

import { Search, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export function NavigationHeader() {
  const [isDark, setIsDark] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  // Auth not required; userEmail management removed

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-semibold text-primary-foreground">R</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">ReelRecipes</span>
        </Link>

        {/* Search - Hidden on mobile */}
        <div className="hidden flex-1 max-w-md md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoek recept of ingrediënt…"
              className="h-10 w-full rounded-full border-border bg-muted/50 pl-10 pr-4 text-sm focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="hidden sm:inline-flex rounded-full"
            onClick={() => (window.location.href = "/import")}
          >
            Importeer
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          {/* Auth controls removed; keep theme and import */}
        </div>
      </div>
    </header>
  )
}
