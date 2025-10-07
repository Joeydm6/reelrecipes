"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { NavigationHeader } from "@/components/navigation-header"

export default function ImportPage() {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [captionText, setCaptionText] = useState("")
  const [preferBasic, setPreferBasic] = useState(false)
  const [preferBasicTouched, setPreferBasicTouched] = useState(false)
  const [ingredientsText, setIngredientsText] = useState("")
  const [stepsText, setStepsText] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [llmStatus, setLlmStatus] = useState<{ status: string; model?: string | null; baseUrl?: string; selectedAvailable?: boolean } | null>(null)
  const [oembedStatus, setOembedStatus] = useState<{ status: string; version?: string; hasToken?: boolean; http?: number; message?: string } | null>(null)
  const router = useRouter()

  function formatErrorDetails(raw: string | undefined) {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // Unescape common sequences and keep line breaks readable
      return raw
        .replace(/\\\//g, "/")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch('/api/llm/health', { cache: 'no-store' })
        const j = await r.json().catch(() => null)
        if (mounted) setLlmStatus(j || null)
      } catch {
        if (mounted) setLlmStatus({ status: 'down' })
      }
      try {
        const r2 = await fetch('/api/oembed/health', { cache: 'no-store' })
        const j2 = await r2.json().catch(() => null)
        if (mounted) setOembedStatus(j2 || null)
      } catch {
        if (mounted) setOembedStatus({ status: 'down' })
      }
    })()
    return () => { mounted = false }
  }, [])

  // Auto-toggle Quick import based on oEmbed health (unless user manually changed it)
  useEffect(() => {
    if (!preferBasicTouched) {
      if (oembedStatus?.status === 'up') {
        setPreferBasic(true)
      } else {
        setPreferBasic(false)
      }
    }
  }, [oembedStatus, preferBasicTouched])

  async function submit() {
    setError(null)
    setLoading(true)
    let extracted: any = null

    // 1) Probeer eerst recept te extraheren via LLM op basis van Instagram URL
    if (url.trim().length > 0) {
      try {
        const resp = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, captionOverride: captionText, preferBasic }),
        })
        if (resp.ok) {
          extracted = await resp.json()
          setPreview(extracted)
          // Vul velden zodat gebruiker kan aanpassen
          if (extracted?.title) setTitle(extracted.title)
          if (Array.isArray(extracted?.ingredients_json)) {
            setIngredientsText(
              extracted.ingredients_json
                .map((i: any) => (i.amount ? `${i.amount} ${i.name}` : i.name))
                .join("\n")
            )
          }
          if (Array.isArray(extracted?.steps_json)) {
            setStepsText(extracted.steps_json.map((s: any) => s.text).join("\n"))
          }
          if (Array.isArray(extracted?.tags)) setTagsText(extracted.tags.join(", "))
        } else {
          const err = await resp.json().catch(() => ({}))
          console.warn("LLM extract faalde:", err)
        }
      } catch (e) {
        console.warn("LLM extract error:", (e as any)?.message || e)
      }
    }

    // 2) Bouw payload (LLM-resultaat indien beschikbaar, anders uit handmatige velden)
    const manualIngredients = ingredientsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => ({ name: l }))
    const manualSteps = stepsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => ({ text: l }))
    const manualTags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const computedTitle =
      (extracted?.title || title.trim()) || (url ? `Geïmporteerd: ${new URL(url).hostname}` : "Geïmporteerd recept")

    const payload = {
      title: computedTitle,
      image_url: extracted?.image_url || null,
      servings: extracted?.servings ?? null,
      prep_min: extracted?.prep_min ?? null,
      cook_min: extracted?.cook_min ?? null,
      calories: null,
      tags: Array.isArray(extracted?.tags) && extracted.tags.length ? extracted.tags : manualTags,
      rating: null,
      favorite: false,
      ingredients_json:
        Array.isArray(extracted?.ingredients_json) && extracted.ingredients_json.length
          ? extracted.ingredients_json
          : manualIngredients,
      steps_json:
        Array.isArray(extracted?.steps_json) && extracted.steps_json.length ? extracted.steps_json : manualSteps,
      status: "draft",
      source_url: url || null,
    }

    // 3) Opslaan in Supabase indien geconfigureerd; anders toon alleen opgehaalde velden
    if (!supabase) {
      setLoading(false)
      setError("Supabase niet geconfigureerd. Receptgegevens zijn wel opgehaald; vul evt. aan en configureer Supabase om op te slaan.")
      return
    }

    const { data, error: insertError } = await supabase.from("recipes").insert(payload).select("id").single()

    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data?.id) {
      router.replace(`/recipe/${data.id}`)
    } else {
      router.replace("/")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Recept importeren</h1>
        <p className="mt-2 text-sm text-muted-foreground">Voer een Instagram URL in; ik haal automatisch caption/meta op en zet het om in een recept. Bij beschikbaarheid van oEmbed schakelt Snelle import automatisch in; anders gebruik ik LLM of meta/Jina fallback.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {llmStatus && (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">LLM</span>
                <span className={llmStatus.status === 'up' ? 'inline-flex items-center rounded-full border border-green-600 px-2 py-0.5 text-xs text-green-700' : 'inline-flex items-center rounded-full border border-red-600 px-2 py-0.5 text-xs text-red-700'}>
                  {llmStatus.status === 'up' ? 'Online' : 'Offline'}
                </span>
              </div>
              {llmStatus.baseUrl && (
                <div className="mt-2 text-muted-foreground">Endpoint: {llmStatus.baseUrl}</div>
              )}
              {typeof llmStatus?.selectedAvailable === 'boolean' && (
                <div className="mt-1 text-muted-foreground">Model beschikbaar: {llmStatus.selectedAvailable ? 'ja' : 'nee'}</div>
              )}
              {llmStatus.status !== 'up' && (
                <div className="mt-2 text-muted-foreground">Gebruik caption/meta fallback totdat LLM online is.</div>
              )}
            </div>
          )}
          {oembedStatus && (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Instagram oEmbed</span>
                <span className={
                  oembedStatus.status === 'up'
                    ? 'inline-flex items-center rounded-full border border-green-600 px-2 py-0.5 text-xs text-green-700'
                    : oembedStatus.status === 'missing'
                      ? 'inline-flex items-center rounded-full border border-yellow-600 px-2 py-0.5 text-xs text-yellow-700'
                      : 'inline-flex items-center rounded-full border border-red-600 px-2 py-0.5 text-xs text-red-700'
                }>
                  {oembedStatus.status === 'up' ? 'Geconfigureerd' : oembedStatus.status === 'missing' ? 'Token ontbreekt' : 'Error'}
                </span>
              </div>
              {oembedStatus.status === 'missing' && (
                <div className="mt-2 text-muted-foreground">Zet <code>INSTAGRAM_OEMBED_ACCESS_TOKEN</code> in <code>ui/.env.local</code> om captions automatisch op te halen.</div>
              )}
              {oembedStatus.status === 'error' && (
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <div>
                    Graph API fout: HTTP {oembedStatus.http}. Voor automatische captions is 'Meta oEmbed Read' goedkeuring en Live-mode vereist.
                  </div>
                  <ul className="list-disc pl-5 text-xs">
                    <li>Vraag 'Meta oEmbed Read' aan via App Review.</li>
                    <li>Zet je app in Live mode na goedkeuring.</li>
                    <li>Plaats je token in <code>ui/.env.local</code> als <code>INSTAGRAM_OEMBED_ACCESS_TOKEN</code>.</li>
                  </ul>
                  <div className="flex items-center gap-3 text-xs">
                    <a href="/api/oembed/health" target="_blank" rel="noopener noreferrer" className="underline">Open health-check</a>
                    <a href="https://developers.facebook.com/docs/apps/review/" target="_blank" rel="noopener noreferrer" className="underline">Appreview documentatie</a>
                  </div>
                  {oembedStatus.message && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs underline">Technische details</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 text-xs">
                        {formatErrorDetails(oembedStatus.message) || ''}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              {oembedStatus.status === 'down' && (
                <div className="mt-2 text-muted-foreground">Kon Graph API niet bereiken.</div>
              )}
              {oembedStatus.status !== 'up' && (
                <div className="mt-2 text-muted-foreground">
                  <a href="/api/oembed/health" target="_blank" rel="noopener noreferrer" className="underline">Open health-check</a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/10 p-4 shadow-sm">
          <div className="mb-3">
            <label htmlFor="import-url" className="block text-sm font-medium">Instagram URL</label>
            <div className="mt-2 flex gap-2">
              <Input id="import-url" placeholder="https://www.instagram.com/p/..." value={url} onChange={(e) => setUrl(e.target.value)} />
              <Button onClick={submit} disabled={loading}>{loading ? 'Bezig…' : 'Importeer'}</Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label htmlFor="caption" className="block text-sm font-medium">Caption</label>
            <textarea
              id="caption"
              className="w-full min-h-28 rounded-md border bg-muted/30 p-3 text-sm"
              placeholder={
                preferBasic
                  ? 'Caption aanbevolen bij snelle import\nPlak hier de exacte tekst; LLM wordt overgeslagen.'
                  : 'Caption (optioneel)\nPlak hier de exacte tekst uit de post om de LLM te sturen.'
              }
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <input id="preferBasic" type="checkbox" checked={preferBasic} onChange={(e) => { setPreferBasic(e.target.checked); setPreferBasicTouched(true) }} />
              <label htmlFor="preferBasic" className="cursor-pointer">Snelle import (caption-only, LLM overslaan)</label>
            </div>
            <div className="text-xs text-muted-foreground">
              {preferBasic ? 'Automatisch aan wanneer oEmbed beschikbaar is.' : 'Automatisch uit wanneer oEmbed niet beschikbaar is.'}
            </div>
          </div>

          {preferBasic && captionText.trim().length === 0 && (
            <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              Snelle import is ingeschakeld, maar er is geen caption ingevuld. Zonder caption kan de import leeg blijven.
              Plak de caption uit Instagram voor betere resultaten, of schakel snelle import uit om de LLM te gebruiken.
            </div>
          )}

          {!preferBasic && oembedStatus && oembedStatus.status !== 'up' && (
            <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              Snelle import staat automatisch uit omdat Instagram oEmbed niet beschikbaar is.
              Bekijk de status via <a href="/api/oembed/health" target="_blank" rel="noopener noreferrer" className="underline">health-check</a>.
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/10 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium">Titel</label>
              <Input id="title" placeholder="Titel (optioneel)" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor="tags" className="mb-1 block text-sm font-medium">Tags</label>
              <Input id="tags" placeholder="Tags (komma-gescheiden, optioneel)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ingredients" className="mb-1 block text-sm font-medium">Ingrediënten</label>
              <textarea id="ingredients" className="w-full min-h-32 rounded-md border bg-muted/30 p-3 text-sm" placeholder={'Ingrediënten (één per regel)\nBijv.\n200 g pasta\n3 tenen knoflook\nspinazie'} value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} />
            </div>
            <div>
              <label htmlFor="steps" className="mb-1 block text-sm font-medium">Stappen</label>
              <textarea id="steps" className="w-full min-h-32 rounded-md border bg-muted/30 p-3 text-sm" placeholder={'Stappen (één per regel)\nBijv.\nKook de pasta al dente.\nBak knoflook in olijfolie.'} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
            </div>
          </div>

          {preview && (
            (Array.isArray(preview.ingredients_json) && preview.ingredients_json.length === 0) &&
            (Array.isArray(preview.steps_json) && preview.steps_json.length === 0) && (
              <div className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                Geen ingrediënten of stappen gevonden uit de URL. Instagram verbergt vaak captions zonder login.
                Plak de caption in het veld hierboven voor betere resultaten, of configureer een oEmbed access token
                in je omgeving zodat captions automatisch opgehaald worden.
                {oembedStatus?.status === 'missing' && (
                  <div className="mt-1">Tip: zet <code>INSTAGRAM_OEMBED_ACCESS_TOKEN</code> en optioneel <code>INSTAGRAM_OEMBED_GRAPH_VERSION</code> in <code>ui/.env.local</code>.</div>
                )}
              </div>
            )
          )}
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/10 p-4 shadow-sm">
            <div className="mb-3 text-lg font-medium">Voorvertoning</div>
            <div className="space-y-3">
              <div>Titel: <span className="text-muted-foreground">{preview.title || '(onbekend)'}</span></div>
              {preview.image_url && (
                <img src={preview.image_url} alt="preview" className="h-40 w-full rounded object-cover" />
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 font-medium">Ingrediënten</div>
                  <ul className="list-disc pl-5">
                    {(Array.isArray(preview.ingredients_json) ? preview.ingredients_json : []).slice(0, 12).map((i: any, idx: number) => (
                      <li key={idx}>{i.amount ? `${i.amount} ${i.name}` : i.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 font-medium">Stappen</div>
                  <ol className="list-decimal pl-5">
                    {(Array.isArray(preview.steps_json) ? preview.steps_json : []).slice(0, 12).map((s: any, idx: number) => (
                      <li key={idx}>{s.text}</li>
                    ))}
                  </ol>
                </div>
              </div>
              {Array.isArray(preview.tags) && preview.tags.length > 0 && (
                <div>Tags: <span className="text-muted-foreground">{preview.tags.join(', ')}</span></div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      </div>
    </div>
  )
}
