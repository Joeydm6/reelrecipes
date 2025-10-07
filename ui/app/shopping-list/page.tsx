"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Copy, Trash2, Printer } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ShoppingListPage() {
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [checkedItems, setCheckedItems] = useState<number[]>([])
  const [items, setItems] = useState<{ id: number; qty?: string; unit?: string; item: string }[]>([])
  const params = useSearchParams()

  // Parse recipe IDs from URL and fetch their ingredients
  useEffect(() => {
    const idsParam = params.get("ids")
    if (!idsParam || !supabase) return
    const ids = idsParam.split(",").filter(Boolean)
    ;(async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, ingredients_json")
        .in("id", ids)
      if (error) {
        console.warn("Kon ingrediënten niet laden:", error.message)
        return
      }
      const collected: { id: number; qty?: string; unit?: string; item: string }[] = []
      data?.forEach((r) => {
        const ing = (r.ingredients_json ?? []) as { name: string; amount?: string }[]
        ing.forEach((i, idx) => {
          const { name, amount } = i
          // Best-effort parse amount into qty+unit by splitting
          let qty: string | undefined
          let unit: string | undefined
          if (amount) {
            const parts = amount.split(" ")
            qty = parts[0]
            unit = parts.slice(1).join(" ") || undefined
          }
          collected.push({ id: Number(`${r.id}${idx}`), qty, unit, item: name })
        })
      })
      setItems(collected)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shoppingList = useMemo(() => {
    if (items.length === 0) return [] as { category: string; items: { id: number; qty?: string; unit?: string; item: string }[] }[]
    // Simple categorization based on keyword matching
    const categories = [
      { key: "AGF", match: ["spinazie", "tomaat", "ui", "knoflook", "paprika", "citroen", "komkommer"] },
      { key: "Vlees & Vis", match: ["kip", "zalm", "gehakt", "rund", "tonijn", "garnalen"] },
      { key: "Zuivel", match: ["melk", "kaas", "room", "boter", "yoghurt", "parmezaan"] },
      { key: "Kruiden & Specerijen", match: ["zout", "peper", "kruiden", "oregano", "basilicum", "paprikapoeder"] },
      { key: "Pasta & Granen", match: ["pasta", "rijst", "brood", "couscous", "quinoa"] },
      { key: "Overig", match: [] },
    ]

    const buckets: Record<string, { id: number; qty?: string; unit?: string; item: string }[]> = {}
    categories.forEach((c) => (buckets[c.key] = []))

    items.forEach((it) => {
      const lower = it.item.toLowerCase()
      const cat = categories.find((c) => c.match.some((m) => lower.includes(m)))?.key || "Overig"
      buckets[cat].push(it)
    })

    return categories
      .map((c) => ({ category: c.key, items: buckets[c.key] }))
      .filter((c) => c.items.length > 0)
  }, [items])

  const hasItems = shoppingList.some((cat) => cat.items.length > 0)

  const toggleItem = (id: number) => {
    setCheckedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">Boodschappenlijst</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Samengevoegd uit {params.get("ids")?.split(",").filter(Boolean).length ?? 0} recepten
            </p>
          </div>

          {hasItems ? (
            <>
              {/* Controls */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={groupByCategory ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setGroupByCategory(true)}
                  >
                    Per categorie
                  </Button>
                  <Button
                    variant={!groupByCategory ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setGroupByCategory(false)}
                  >
                    Per recept
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-transparent"
                    onClick={() => {
                      const text = shoppingList
                        .map((cat) =>
                          `${cat.category}\n${cat.items
                            .map((i) => `${i.qty ?? ""} ${i.unit ?? ""} ${i.item}`.trim())
                            .join("\n")}`
                        )
                        .join("\n\n")
                      navigator.clipboard.writeText(text)
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Kopieer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-transparent"
                    onClick={() => window.print()}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full text-destructive bg-transparent">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Wissen
                  </Button>
                </div>
              </div>

              {/* Shopping List */}
              <div className="space-y-6">
                {shoppingList.map((category) => (
                  <Card key={category.category} className="rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border/50 px-5 py-3">
                      <h3 className="font-medium tracking-tight">{category.category}</h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {category.items.map((item) => {
                        const isChecked = checkedItems.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className={`flex-1 ${isChecked ? "opacity-60" : ""}`}>
                              <div className={`${isChecked ? "line-through" : ""}`}>
                                <span className="font-medium">
                                  {item.qty} {item.unit}
                                </span>{" "}
                                {item.item}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Summary Panel */}
              <Card className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {checkedItems.length} van {shoppingList.reduce((acc, cat) => acc + cat.items.length, 0)} items
                    afgevinkt
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    {Math.round(
                      (checkedItems.length / shoppingList.reduce((acc, cat) => acc + cat.items.length, 0)) * 100,
                    )}
                    % compleet
                  </Badge>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              icon="🛒"
              title="Lege boodschappenlijst"
              description="Selecteer recepten op de startpagina en voeg ingrediënten toe aan je lijst."
              actionLabel="Naar recepten"
              actionHref="/"
            />
          )}
        </div>
      </main>
    </div>
  )
}
