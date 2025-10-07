"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export function ShoppingListLauncher() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shoppingListRecipeIds")
      setIds(raw ? JSON.parse(raw) : [])
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === "shoppingListRecipeIds" && e.newValue) {
        try {
          setIds(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  if (ids.length === 0) return null
  const href = `/shopping-list?ids=${encodeURIComponent(ids.join(","))}`

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <Link href={href} className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow">
        Boodschappenlijst ({ids.length})
      </Link>
    </div>
  )
}