"use client"

import { Heart, Clock, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface RecipeCardProps {
  id: string
  title: string
  image: string
  servings: number
  totalTime: number
  calories: number
  tags: string[]
  rating?: number
  isFavorite?: boolean
}

export function RecipeCard({
  id,
  title,
  image,
  servings,
  totalTime,
  calories,
  tags,
  rating,
  isFavorite = false,
}: RecipeCardProps) {
  const [favorite, setFavorite] = useState(isFavorite)
  const [isAdded, setIsAdded] = useState(false)
  const [updatingFav, setUpdatingFav] = useState(false)

  // initialize isAdded from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("shoppingListRecipeIds")
      const ids: string[] = raw ? JSON.parse(raw) : []
      setIsAdded(ids.includes(id))
    } catch {}
  }, [id])

  function toggleInShoppingList() {
    try {
      const raw = localStorage.getItem("shoppingListRecipeIds")
      const ids: string[] = raw ? JSON.parse(raw) : []
      let next: string[]
      if (ids.includes(id)) {
        next = ids.filter((r) => r !== id)
      } else {
        next = [...ids, id]
      }
      localStorage.setItem("shoppingListRecipeIds", JSON.stringify(next))
      setIsAdded(next.includes(id))
      // notify other components
      window.dispatchEvent(new StorageEvent("storage", { key: "shoppingListRecipeIds", newValue: JSON.stringify(next) }))
    } catch {
      setIsAdded((prev) => !prev)
    }
  }

  async function toggleFavorite() {
    const next = !favorite
    setFavorite(next)
    if (!supabase) return
    setUpdatingFav(true)
    const { error } = await supabase
      .from("recipes")
      .update({ favorite: next })
      .eq("id", id)
    setUpdatingFav(false)
    if (error) {
      // rollback optimistic update on error
      setFavorite(!next)
      // optional: surface error via toast later
      console.warn("Kon favoriet niet bijwerken:", error.message)
    }
  }

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      {/* Full-card clickable overlay to open recipe detail */}
      <Link href={`/recipe/${id}`} className="absolute inset-0 z-10" aria-label={`Open ${title}`}>
        <span className="sr-only">Open recept</span>
      </Link>
      {/* Hero Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={image || "/placeholder.svg"}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight">
          <span className="group-hover:underline">{title}</span>
        </h3>

        {/* Meta Row */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{servings}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{totalTime} min</span>
          </div>
          <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-medium">
            {calories} kcal
          </Badge>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-full border-border/60 px-2.5 py-0.5 text-xs font-normal"
            >
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="rounded-full border-border/60 px-2.5 py-0.5 text-xs font-normal">
              +{tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="relative z-20 flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={toggleFavorite}
              disabled={updatingFav}
            >
              <Heart
                className={`h-4 w-4 transition-all ${favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
              <span className="sr-only">Favoriet</span>
            </Button>
            {rating && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs font-medium">
                {rating}/10
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={toggleInShoppingList}>
            {isAdded ? "✓ Toegevoegd" : "+ Lijst"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
