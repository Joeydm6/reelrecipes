"use client"

import { useEffect, useState } from "react"

type Ingredient = { name: string; amount?: string }
type Step = { text: string }

export function CookChecklist({ ingredients, steps }: { ingredients: Ingredient[]; steps: Step[] }) {
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([])
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([])

  useEffect(() => {
    setCheckedIngredients(Array.from({ length: ingredients.length }, () => false))
  }, [ingredients])

  useEffect(() => {
    setCheckedSteps(Array.from({ length: steps.length }, () => false))
  }, [steps])

  // First incomplete step index
  const firstIncompleteIndex = checkedSteps.findIndex((v) => !v)

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <section>
        <h3 className="text-lg font-medium mb-3">Ingrediënten</h3>
        {ingredients.length === 0 ? (
          <p className="text-muted-foreground">Geen ingrediënten.</p>
        ) : (
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checkedIngredients[i] || false}
                  onChange={(e) => {
                    const next = [...checkedIngredients]
                    next[i] = e.target.checked
                    setCheckedIngredients(next)
                  }}
                />
                <span>
                  {ing.name}
                  {ing.amount ? ` — ${ing.amount}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-lg font-medium mb-3">Bereiding</h3>
        {steps.length === 0 ? (
          <p className="text-muted-foreground">Geen stappen.</p>
        ) : (
          <ol className="space-y-2 list-decimal list-inside">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={checkedSteps[i] || false}
                  onChange={(e) => {
                    const next = [...checkedSteps]
                    next[i] = e.target.checked
                    setCheckedSteps(next)
                  }}
                />
                <span
                  className={
                    (checkedSteps[i] ? "line-through text-muted-foreground" : "") +
                    (i === firstIncompleteIndex ? " font-semibold" : "")
                  }
                >
                  {s.text}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}