"use client"

import { Search, SlidersHorizontal, Heart, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function FiltersBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [sortBy, setSortBy] = useState("datum")
  const [searchQuery, setSearchQuery] = useState("")

  const availableTags = ["kip", "pasta", "<30 min", "vegetarisch", "gezond", "makkelijk"]

  // Initialize state from URL params
  useEffect(() => {
    const tags = searchParams.get("tags")
    const fav = searchParams.get("fav")
    const sort = searchParams.get("sort")
    const q = searchParams.get("q")
    if (tags) setSelectedTags(tags.split(",").filter(Boolean))
    if (fav) setShowFavorites(fav === "1")
    if (sort) setSortBy(sort)
    if (q) setSearchQuery(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push filter state to URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    if (selectedTags.length > 0) sp.set("tags", selectedTags.join(","))
    else sp.delete("tags")
    if (showFavorites) sp.set("fav", "1")
    else sp.delete("fav")
    if (sortBy) sp.set("sort", sortBy)
    if (searchQuery.trim().length > 0) sp.set("q", searchQuery.trim())
    else sp.delete("q")
    router.replace(`/?${sp.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags, showFavorites, sortBy, searchQuery])

  return (
    <div className="sticky top-16 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search - Mobile */}
        <div className="relative flex-1 sm:max-w-xs md:hidden">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Zoek recept…"
            className="h-10 w-full rounded-full border-border bg-muted/50 pl-10 pr-4 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tags Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full bg-transparent">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0">
                    {selectedTags.length}
                  </Badge>
                )}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={(checked) => {
                    setSelectedTags(checked ? [...selectedTags, tag] : selectedTags.filter((t) => t !== tag))
                  }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorites Toggle */}
          <Button
            variant={showFavorites ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setShowFavorites(!showFavorites)}
          >
            <Heart className={`mr-2 h-4 w-4 ${showFavorites ? "fill-current" : ""}`} />
            Favorieten
          </Button>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full bg-transparent">
                Sorteer: {sortBy}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                <DropdownMenuRadioItem value="datum">Datum</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating">Rating</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="tijd">Tijd</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="a-z">A–Z</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
