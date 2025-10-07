import { NavigationHeader } from "@/components/navigation-header"
import { supabase } from "@/lib/supabase"
import { FiltersBar } from "@/components/filters-bar"
import { RecipeCard } from "@/components/recipe-card"
import { EmptyState } from "@/components/empty-state"
import { ShoppingListLauncher } from "@/components/shopping-list-launcher"

type DbRecipe = {
  id: string
  title: string | null
  image_url: string | null
  servings: number | null
  prep_min: number | null
  cook_min: number | null
  calories: number | null
  tags: string[] | null
  rating: number | null
  favorite: boolean | null
  created_at?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  let recipeRows: DbRecipe[] = []
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | string[] | undefined>
  const q = typeof sp?.q === "string" ? sp.q : ""
  const fav = sp?.fav === "1"
  const sort = typeof sp?.sort === "string" ? sp.sort : "datum"
  const tagsParam = typeof sp?.tags === "string" ? sp.tags : undefined
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : []

  if (supabase) {
    let query = supabase
      .from("recipes")
      .select(
        "id,title,image_url,servings,prep_min,cook_min,calories,tags,rating,favorite,created_at"
      )

    if (q) query = query.ilike("title", `%${q}%`)
    if (fav) query = query.eq("favorite", true)
    if (tags.length > 0) query = query.overlaps("tags", tags)

    // Sortering
    if (sort === "datum") {
      query = query.order("created_at", { ascending: false })
    } else if (sort === "rating") {
      query = query.order("rating", { ascending: false, nullsFirst: false })
    } else if (sort === "a-z") {
      query = query.order("title", { ascending: true, nullsFirst: true })
    } else if (sort === "tijd") {
      // Niet direct total_time beschikbaar: sorteer op prep_min, daarna cook_min
      query = query.order("prep_min", { ascending: true, nullsFirst: true }).order("cook_min", {
        ascending: true,
        nullsFirst: true,
      })
    }

    const { data, error } = await query

    if (error) {
      console.warn("Kon recepten niet laden:", error.message)
    } else if (data) {
      recipeRows = data
    }
  }

  const recipes = recipeRows.map((r) => ({
    id: r.id,
    title: r.title ?? "Onbekend recept",
    image: r.image_url ?? "/placeholder.svg",
    servings: r.servings ?? 0,
    totalTime: (r.prep_min ?? 0) + (r.cook_min ?? 0),
    calories: r.calories ?? 0,
    tags: r.tags ?? [],
    rating: r.rating ?? undefined,
    isFavorite: r.favorite ?? false,
  }))

  const hasRecipes = recipes.length > 0

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <FiltersBar />

      <main className="container mx-auto px-4 py-8">
        {hasRecipes ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} {...recipe} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🍳"
            title="Nog geen recepten"
            description="Importeer een recept vanaf Instagram om te starten."
            actionLabel="Importeer recept"
            actionHref="/import"
          />
        )}
      </main>

      {/* Floating shopping list launcher */}
      <ShoppingListLauncher />
    </div>
  )
}
