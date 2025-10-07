"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function DeleteRecipeButton({ id }: { id: string }) {
  const router = useRouter()
  async function onDelete() {
    const ok = window.confirm("Weet je zeker dat je dit recept wil verwijderen?")
    if (!ok) return
    if (!supabase) {
      alert("Supabase niet geconfigureerd.")
      return
    }
    const { error } = await supabase.from("recipes").delete().eq("id", id)
    if (error) {
      alert(`Verwijderen mislukt: ${error.message}`)
      return
    }
    router.replace("/")
  }
  return (
    <Button variant="destructive" className="h-9" onClick={onDelete}>
      Verwijderen
    </Button>
  )
}