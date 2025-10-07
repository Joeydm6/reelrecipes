import { supabase } from "@/lib/supabase"
import { NavigationHeader } from "@/components/navigation-header"
import { EmptyState } from "@/components/empty-state"
import { CookChecklist } from "@/components/cook-checklist"
import Link from "next/link"
import { DeleteRecipeButton } from "@/components/delete-recipe-button"

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
  ingredients_json: { name: string; amount?: string }[] | null
  steps_json: { text: string }[] | null
}

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  if (!supabase) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="container mx-auto px-4 py-8">
          <EmptyState
            icon="🔌"
            title="Supabase niet geconfigureerd"
            description="Stel NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in."
            actionLabel="Terug naar overzicht"
            actionHref="/"
          />
        </main>
      </div>
    )
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id,title,image_url,servings,prep_min,cook_min,calories,tags,rating,favorite,ingredients_json,steps_json"
    )
    .eq("id", params.id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("Kon recept niet laden:", error.message)
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="container mx-auto px-4 py-8">
          <EmptyState
            icon="🥣"
            title="Recept niet gevonden"
            description="Dit recept bestaat niet of is verwijderd."
            actionLabel="Terug naar overzicht"
            actionHref="/"
          />
        </main>
      </div>
    )
  }

  const totalTime = (data.prep_min ?? 0) + (data.cook_min ?? 0)
  const tags = data.tags ?? []
  const ingredients = data.ingredients_json ?? []
  const steps = data.steps_json ?? []

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{data.title ?? "Onbekend recept"}</h1>
          <p className="text-muted-foreground">
            {data.servings ? `${data.servings} porties` : "Porties onbekend"} · {totalTime} min
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Link href="/" className="text-sm underline text-muted-foreground">Terug naar overzicht</Link>
            <DeleteRecipeButton id={data.id} />
          </div>
        </header>

        {data.image_url && (
          <img
            src={data.image_url}
            alt={data.title ?? "Recept afbeelding"}
            className="w-full max-h-[400px] object-cover rounded-md"
          />
        )}

        <CookChecklist ingredients={ingredients} steps={steps} />
      </main>
    </div>
  )
}
