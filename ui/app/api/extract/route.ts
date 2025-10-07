import { NextResponse } from "next/server"

function stripCodeFences(s: string) {
  // Prefer extracting the first fenced code block if present anywhere
  const block = s.match(/```(?:json|\w+)?\s*([\s\S]*?)\s*```/i)
  if (block?.[1]) {
    return block[1].trim()
  }
  // Otherwise, try to isolate the first JSON object by braces
  const firstBrace = s.indexOf("{")
  const lastBrace = s.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1).trim()
  }
  // Fall back to original string (may fail to parse)
  return s.trim()
}

// Very lightweight caption parser to produce ingredients/steps from plain text.
// Handles Dutch and English common patterns; best-effort only.
function wordToNumber(word: string) {
  const map: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  }
  return map[word.toLowerCase()] ?? NaN
}

function basicParseFromText(text: string | null | undefined) {
  if (!text) {
    return { ingredients_json: [], steps_json: [], tags: [] as string[], servings: null as number | null }
  }
  const raw = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ") // collapse spaces/tabs but preserve newlines
    .replace(/\s*\n\s*/g, "\n") // normalize newline spacing
    .trim()

  // Werk met expliciete regels; zinnen splitsen we pas bij stappen
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean)

  const amountUnits = [
    "g",
    "gr",
    "gram",
    "kg",
    "ml",
    "l",
    "el",
    "tl",
    "eetlepel",
    "theelepel",
    "cup",
    "tbsp",
    "tsp",
    "oz",
  ]

  const stepVerbs = [
    // NL
    "bak",
    "kook",
    "snijd",
    "mix",
    "roer",
    "voeg",
    "meng",
    "verwarm",
    "serveer",
    "klop",
    "giet",
    "breng",
    "stoof",
    "smoor",
    "marineer",
    "bak af",
    // EN
    "bake",
    "cook",
    "cut",
    "slice",
    "mix",
    "stir",
    "add",
    "combine",
    "heat",
    "serve",
    "whisk",
    "pour",
    "drizzle",
    "season",
    "simmer",
    "marinate",
    "toast",
    "fry",
    "grill",
    "coat",
    "layer",
    "assemble",
    "blend",
    "beat",
  ]

  const ingredients_json: { name: string; amount?: string }[] = []
  const steps_json: { text: string }[] = []
  const tags: string[] = []
  let servings: number | null = null
  let inSteps: boolean = false

  for (const line of lines) {
    // Skip obvious noise lines early
    if (/^@\w[\w.\-]*/i.test(line)) continue
    if (/https?:\/\//i.test(line)) continue
    if (/^[=\-]{2,}$/i.test(line)) continue

    // Detect "to make X servings" pattern
    if (!servings) {
      const makeServNum = line.match(/to\s+make\s+(\d+)\s+servings/i)
      if (makeServNum) {
        servings = Number(makeServNum[1]) || null
        continue
      }
      const makeServWord = line.match(/to\s+make\s+(\w+)\s+servings/i)
      if (makeServWord) {
        const n = wordToNumber(makeServWord[1])
        if (!isNaN(n)) {
          servings = n
          continue
        }
      }
    }

    // Sectiekoppen: schakelen naar stappen
    const isHowToHeader = /^(?:how\s+to\s+make|bereiding|method|directions)\b/i.test(line)
    if (isHowToHeader) { inSteps = true; continue }

    const isNeedList = /you\s*(?:’|'|`)\s*ll\s+need|you\s+will\s+need|benodigdheden|ingredients\b/i.test(line)
    const expanded = isNeedList ? splitLongIngredientLine(line) : [line]

    for (const part of expanded) {
    // servings like "voor 4 personen" or "serves 4"
      let servMatch = part.match(/(?:voor\s*(\d+)\s*personen|serves\s*(\d+))/i)
      if (!servings && servMatch) {
        servings = Number(servMatch[1] || servMatch[2]) || null
        continue
      }
    // word-number variants e.g. "serves two", "voor vier personen"
      const servWordMatch = part.match(/(?:voor\s*(\w+)\s*personen|serves\s*(\w+))/i)
      if (!servings && servWordMatch) {
        const n = wordToNumber(servWordMatch[1] || servWordMatch[2] || "")
        if (!isNaN(n)) {
          servings = n
          continue
        }
      }

    // Tag hints
      if (/\bvegan\b/i.test(part)) tags.push("vegan")
      if (/\bvegetar/i.test(part)) tags.push("vegetarisch")
      if (/\bgluten[- ]?free\b/i.test(part)) tags.push("glutenvrij")
      if (/\bpasta\b/i.test(part)) tags.push("pasta")
      if (/\bsalade\b/i.test(part)) tags.push("salade")

    // Ingredient heuristics: contains a number or an amount unit
      const hasNumber = /\d/.test(part)
      const hasUnit = amountUnits.some((u) => new RegExp(`\\b${u}\\b`, "i").test(part))
      const looksLikeIngredient = hasNumber || hasUnit || /\bgram\b|\btenen\b|\btakken\b|\bbollen\b/i.test(part)

    // Step heuristics: starts with a verb, includes action words, or matches broader patterns
      const startsWithVerb = stepVerbs.some((v) => part.toLowerCase().startsWith(v))
      const hasAction = /\b(roer|meng|voeg|snijd|hak|bak|kook|verwarm|serveer|klop|giet|stoof|smoor|marineer|stir|add|mix|cook|bake|cut|slice|heat|serve|boil|divide|top|reserve|drain|toss|whisk|pour|drizzle|season|simmer|marinate|toast|fry|grill|coat|layer|assemble|blend|beat)\b/i.test(part)
      const isStepCandidate = startsWithVerb || hasAction || looksLikeStepLine(part)

      if (!isStepCandidate && (looksLikeIngredient || isNeedList)) {
        // try split amount and name very loosely
        const m = part.match(/^(\d+[\,\.\/]?\d*\s*\w+)?\s*(.*)$/)
        const amount = m?.[1]?.trim() || undefined
        const name = (m?.[2] || part).trim()
        ingredients_json.push({ name, amount })
      } else if (inSteps || isStepCandidate) {
        const sentences = part.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0)
        for (const s of sentences) {
          steps_json.push({ text: s })
        }
      }
    }
  }

  // Deduplicate tags
  const uniqueTags = Array.from(new Set(tags))

  return { ingredients_json, steps_json, tags: uniqueTags, servings }
}

function deriveTitleFromCaption(text: string | null | undefined): string | null {
  if (!text) return null
  // Remove common markdown link noise from captions/titles
  const firstLineRaw = text.split(/\n/)[0] || ""
  const firstLine = firstLineRaw
    .replace(/\[[^\]]+\]\([^\)]+\)/g, "") // strip [label](url)
    .replace(/^\s*@[\w.\-]+(?:’|'|`)?s\s+/i, "") // strip leading @handle's
    .replace(/[=\-]{2,}/g, " ") // collapse repeated separators like ======= or ------
    .replace(/\s+or\s+Meta\b.*$/i, "") // drop trailing "or Meta" footer fragment
    .replace(/\s*\bor\b\s*$/i, "") // drop dangling trailing "or"
    .replace(/\s+English\s*$/i, "") // drop trailing language toggle
    .trim()
  // Patterns like "How To Make ..." or "4-Ingredient Peanut Chicken Noodles"
  const howTo = firstLine.match(/how\s+to\s+make\s+(.+)/i)
  if (howTo?.[1]) return howTo[1].trim()
  // Prefer generic "N-Ingredient <dish>" patterns
  const nIng = firstLine.match(/\b\d+\s*-\s*ingredient\s+(.+)/i)
  if (nIng?.[1]) return nIng[1].trim()
  // If line has hyphenated description, prefer main dish name
  const ingredientTitle = firstLine.match(/\b([\w\- ]*peanut[\w\- ]*noodles|ramen|pasta|salad|chicken[\w\- ]*noodles)\b/i)
  if (ingredientTitle?.[1]) return ingredientTitle[1].trim()
  return firstLine.length > 0 ? firstLine : null
}

// --- Sanitization helpers to improve ingredient/step quality ---
const WORD_NUMBERS = /(one|two|three|four|five|six|seven|eight|nine|ten|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien)/i
const QUANTITY_SPLIT_RE = new RegExp(
  // Lookahead splits before a quantity or word-number or "juice of"
  String.raw`(?=\b(?:${WORD_NUMBERS.source}|\d+(?:[\/.]\d+)?)\b|\bjuice\s+of\b)`,
  "i"
)

function looksLikeStepLine(line: string): boolean {
  const l = line.toLowerCase()
  return (
    /\b(add|stir|mix|combine|cook|bake|heat|serve|toss|drain|reserve|enjoy|store|saute|brown|chop|slice|turn off|preheat|boil|divide|top)\b/.test(l) ||
    /^(before|finally|then)\b/.test(l)
  )
}

function cleanIntro(text: string): string {
  return text
    .replace(/how\s+to\s+make\b[^:]*:?\s*/i, "")
    .replace(/you\s*(?:’|'|`)?ll\s+need\s*:?/i, "")
    .replace(/you\s+will\s+need\s*:?/i, "")
    .trim()
}

function splitLongIngredientLine(line: string): string[] {
  const cleaned = cleanIntro(line)
  // If line contains a colon (You’ll need: ...), take the part after colon
  const afterColon = cleaned.split(/:\s*/).pop() || cleaned
  const parts = afterColon.split(QUANTITY_SPLIT_RE).map((p) => p.trim()).filter(Boolean)
  // If we didn’t find splits but the line is still very long, try commas as soft split
  if (parts.length <= 1 && /,\s*/.test(cleaned)) {
    return afterColon.split(/,\s*/).map((p) => p.trim()).filter(Boolean)
  }
  return parts
}

function sanitizeIngredientsAndSteps(
  ingredients: { name: string; amount?: string }[],
  steps: { text: string }[],
  caption: string | null | undefined
) {
  const outIngredients: { name: string; amount?: string }[] = []
  const outSteps: { text: string }[] = Array.isArray(steps)
    ? steps.filter((s) => typeof s?.text === "string" && s.text.trim().length > 0)
           .map((s) => ({ text: s.text.trim() }))
    : []

  for (const ing of Array.isArray(ingredients) ? ingredients : []) {
    const name = (ing?.name || "").trim()
    if (!name) continue

    // Move intros or action-like sentences to steps
    if (/^how\s+to\s+make\b/i.test(name) || looksLikeStepLine(name)) {
      outSteps.push({ text: name })
      continue
    }

    // Explode "you’ll need" style into multiple ingredients
    if (/you\s*(?:’|'|`)?ll\s+need|you\s+will\s+need|benodigdheden/i.test(name)) {
      const items = splitLongIngredientLine(name)
      for (const item of items) {
        if (!item) continue
        // filter residual action phrases
        if (looksLikeStepLine(item)) {
          outSteps.push({ text: item })
        } else {
          outIngredients.push({ name: item })
        }
      }
      continue
    }

    // If the ingredient line is extremely long, attempt splitting
    if (name.length > 100) {
      const items = splitLongIngredientLine(name)
      if (items.length > 1) {
        for (const item of items) {
          if (!item) continue
          if (looksLikeStepLine(item)) outSteps.push({ text: item })
          else outIngredients.push({ name: item })
        }
        continue
      }
    }

    outIngredients.push({ name, amount: ing.amount })
  }

  // Deduplicate ingredients by name
  const seen = new Set<string>()
  const dedupIngredients = outIngredients
    .map((i) => ({ name: (i.name || "").trim(), amount: i.amount?.trim() }))
    .filter((i) => i.name.length > 0)
    .filter((i) => {
      const key = i.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const finalSteps = outSteps
    .filter((s) => typeof s?.text === "string" && s.text.trim().length > 0)
    .map((s) => s.text.trim())
    // Strip intros and obvious noise
    .filter((t) => !/^how\s+to\s+make\b/i.test(t))
    .filter((t) => !/^@\w[\w.\-]*/i.test(t))
    .filter((t) => !/https?:\/\//i.test(t))
    .filter((t) => !/^[=\-]{2,}$/i.test(t))
    .map((t) => ({ text: t }))

  return { ingredients_json: dedupIngredients, steps_json: finalSteps }
}

async function fetchInstagramMeta(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    const html = await res.text()
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    // Try twitter:description as extra caption source
    const twDescMatch = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    // Also try generic meta description
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)

    // Extract JSON-LD blocks and try to pull caption/articleBody/description
    const jsonLdBlocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    let jsonLdCaption: string | null = null
    for (const m of jsonLdBlocks) {
      const raw = m[1]?.trim()
      if (!raw) continue
      try {
        const obj = JSON.parse(raw)
        const candidate = (obj?.caption || obj?.articleBody || obj?.description || null)
        if (candidate && typeof candidate === "string") {
          jsonLdCaption = candidate
          break
        }
        // Sometimes JSON-LD is an array
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const c = (item?.caption || item?.articleBody || item?.description || null)
            if (c && typeof c === "string") {
              jsonLdCaption = c
              break
            }
          }
        }
      } catch {
        // ignore JSON parse errors
      }
      if (jsonLdCaption) break
    }

    const bestCaption = jsonLdCaption || metaDescMatch?.[1] || twDescMatch?.[1] || descMatch?.[1] || null
    return {
      title: titleMatch?.[1] || null,
      description: descMatch?.[1] || twDescMatch?.[1] || metaDescMatch?.[1] || null,
      caption: bestCaption,
      image: imageMatch?.[1] || null,
      htmlLength: html.length,
    }
  } catch {
    return null
  }
}

// Optional: Instagram oEmbed via Facebook Graph API (requires access token)
async function fetchInstagramOEmbed(url: string) {
  const token = process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN
  if (!token) return null
  const version = process.env.INSTAGRAM_OEMBED_GRAPH_VERSION || "v19.0"
  const api = `https://graph.facebook.com/${version}/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`
  try {
    const res = await fetch(api, { cache: "no-store" })
    if (!res.ok) return null
    const json = await res.json()
    // Attempt to pull caption from title or blockquote html
    let caption: string | null = null
    if (typeof json.title === "string" && json.title.trim().length > 0) {
      caption = json.title.trim()
    } else if (typeof json.html === "string") {
      const m = json.html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)
      if (m?.[1]) {
        const block = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        if (block) caption = block
      }
    }
    return {
      author_name: json.author_name || null,
      thumbnail_url: json.thumbnail_url || null,
      caption,
      html: json.html || null,
    }
  } catch {
    return null
  }
}

// Attempt to fetch readable page text via Jina AI Reader.
// This often extracts human-readable content from JS-heavy pages without login.
async function fetchReadableText(url: string): Promise<string | null> {
  try {
    const normalized = url.replace(/^https?:\/\//i, "")
    const readerUrl = `https://r.jina.ai/http://${normalized}`
    const res = await fetch(readerUrl, { cache: "no-store" })
    if (!res.ok) return null
    const text = await res.text()
    // Prefer the Title line Jina returns; it often includes caption-like text
    const titleMatch = text.match(/^\s*Title:\s*([^\n]+)/im)
    const title = titleMatch?.[1]?.trim()
    // Extract markdown content and filter common login/footer noise
    const mdStart = text.indexOf("Markdown Content:")
    let main = mdStart !== -1 ? text.slice(mdStart + "Markdown Content:".length) : text
    const isInstagram = /instagram\.com/i.test(url)
    const lines = main
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !/Login\s*•\s*Instagram/i.test(l))
      .filter((l) => !/Phone number, username, or email|Password\b|Log in\b|Sign up\b/i.test(l))
      .filter((l) => !/©\s*\d{4,}\s*Instagram\s*from\s*Meta/i.test(l))
      // Instagram-specific footer/navigation noise
      .filter((l) => !isInstagram || !/\b(About|Blog|Jobs|Help|API|Privacy|Terms|Locations|Instagram Lite|Meta AI|Threads|Contact Uploading|Non-Users|Meta Verified|English)\b/i.test(l))
      // Drop lines that are mostly a long list of markdown links (footer/nav)
      .filter((l) => !isInstagram || ( (l.match(/\]\(/g) || []).length < 2 ))
      // Drop obvious external docs/footer domains often present on Instagram pages
      .filter((l) => !isInstagram || !/(about\.instagram\.com|help\.instagram\.com|developers\.facebook\.com|about\.meta\.com|meta\.ai|threads\.(?:net|com))/i.test(l))
    const body = lines.join("\n")
    const combined = [title, body].filter(Boolean).join("\n\n")
    const trimmed = (combined || "").replace(/\s+/g, " ").trim()
    if (trimmed && trimmed.length > 50) return trimmed
    return null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { url, captionOverride, preferBasic } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Geef een geldige Instagram URL mee." }, { status: 400 })
    }

    const meta = await fetchInstagramMeta(url)
    const oembed = await fetchInstagramOEmbed(url)
    const readable = await fetchReadableText(url)
    const baseUrl = process.env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1"
    const model = process.env.LM_STUDIO_MODEL || "llama-3.1-8b-instruct"

    const system = `Je bent een culinair parser. Je ontvangt tekst/meta van een Instagram post. Extraheer een recept als strikt JSON en BASEER ALLES uitsluitend op de gegeven caption/meta. Vul niets in dat niet expliciet in de tekst staat. Als informatie ontbreekt, laat velden leeg of null. Geen extra uitleg of tekst buiten JSON.
Gebruik exact deze structuur:
{
  "title": string,
  "ingredients_json": [{ "name": string, "amount": string? }],
  "steps_json": [{ "text": string }],
  "tags": string[],
  "servings": number?,
  "prep_min": number?,
  "cook_min": number?,
  "image_url": string?
}
Houd hoeveelheden en eenheden zoals genoemd. Gebruik uitsluitend woorden en getallen uit de caption/meta. Geen gokwerk; als je het niet zeker weet, laat leeg.`

    const bestText = (typeof captionOverride === 'string' && captionOverride.trim().length > 0)
      ? captionOverride.trim()
      : (oembed?.caption || meta?.caption || meta?.description || readable || null)
    const user = `Instagram URL: ${url}\n\nMeta: ${meta ? JSON.stringify(meta) : "geen meta"}\n\nTekst: ${bestText ?? "(geen tekst)"}\n\nAls je ingrediënten of stappen herkent uit de tekst/omschrijving, zet ze netjes per regel in arrays.`

    // If caller prefers basic parsing, bypass LLM entirely
    if (preferBasic) {
      const basic = basicParseFromText(bestText)
      const shaped = sanitizeIngredientsAndSteps(basic.ingredients_json, basic.steps_json, bestText)
      const title = deriveTitleFromCaption(bestText) || meta?.title || "Onbekend recept"
      return NextResponse.json({
        title,
        ingredients_json: shaped.ingredients_json,
        steps_json: shaped.steps_json,
        tags: Array.from(new Set([...(basic.tags || []), ...(meta?.title ? [] : [])])),
        servings: basic.servings ?? null,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
        note: "LLM overgeslagen op verzoek (preferBasic)."
      }, { status: 200 })
    }

    // Call LM Studio (OpenAI-compatible) without SDK
    let res: Response
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      })
    } catch (e: any) {
      // If LLM endpoint unreachable, build best-effort from meta description
      const basic = basicParseFromText(bestText)
      const fallback = {
        title: meta?.title || "Onbekend recept",
        ingredients_json: basic.ingredients_json,
        steps_json: basic.steps_json,
        tags: basic.tags,
        servings: basic.servings,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
      }
      return NextResponse.json(fallback, { status: 200 })
    }
    if (!res.ok) {
      const text = await res.text()
      // Still return meta-based best-effort payload so UI can proceed
      const basic = basicParseFromText(bestText)
      const minimal = {
        title: meta?.title || "Onbekend recept",
        ingredients_json: basic.ingredients_json,
        steps_json: basic.steps_json,
        tags: basic.tags,
        servings: basic.servings,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
        error: `LLM fout: ${text}`,
      }
      return NextResponse.json(minimal, { status: 200 })
    }

    let json: any
    try {
      json = await res.json()
    } catch (e) {
      // If response wasn't valid JSON, still proceed with basic fallback
      const basic = basicParseFromText(bestText)
      const minimal = {
        title: meta?.title || "Onbekend recept",
        ingredients_json: basic.ingredients_json,
        steps_json: basic.steps_json,
        tags: basic.tags,
        servings: basic.servings,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
        error: "LLM gaf geen geldig JSON terug",
      }
      return NextResponse.json(minimal, { status: 200 })
    }
    const content: string = json?.choices?.[0]?.message?.content || ""
    if (!content) {
      // Graceful fallback when LLM returns no content
      const basic = basicParseFromText(bestText)
      const minimal = {
        title: meta?.title || "Onbekend recept",
        ingredients_json: basic.ingredients_json,
        steps_json: basic.steps_json,
        tags: basic.tags,
        servings: basic.servings,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
        error: "Lege LLM response",
      }
      return NextResponse.json(minimal, { status: 200 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(stripCodeFences(content))
    } catch (e) {
      // Graceful fallback: build best-effort payload from caption/meta instead of failing
      const basic = basicParseFromText(bestText)
      const fallback = {
        title: meta?.title || "Onbekend recept",
        ingredients_json: basic.ingredients_json,
        steps_json: basic.steps_json,
        tags: basic.tags,
        servings: basic.servings,
        prep_min: null,
        cook_min: null,
        image_url: oembed?.thumbnail_url || meta?.image || null,
        error: "Kon JSON niet parsen uit LLM response",
        raw: content,
      }
      return NextResponse.json(fallback, { status: 200 })
    }

    // Normalize arrays from LLM: coerce strings to objects and filter noise
    const normIngredients = Array.isArray(parsed.ingredients_json)
      ? parsed.ingredients_json
          .map((i: any) =>
            typeof i === "string"
              ? { name: i }
              : { name: String(i?.name || "").trim(), amount: typeof i?.amount === "string" ? i.amount.trim() : (i?.amount ?? undefined) }
          )
          .filter((i: any) => typeof i?.name === "string" && i.name.trim().length > 0)
      : []
    const normSteps = Array.isArray(parsed.steps_json)
      ? parsed.steps_json
          .map((s: any) => (typeof s === "string" ? s : (typeof s?.text === "string" ? s.text : "")))
          .map((t: string) => String(t).trim())
          .filter((t: string) => t.length > 0)
          // Strip common non-step noise
          .filter((t: string) => !/^=+$|^-+$|^or$|^english$/i.test(t))
          .filter((t: string) => !/^how\s+to\s+make\b/i.test(t))
          .filter((t: string) => !/^@\w[\w.\-]*/i.test(t))
          .filter((t: string) => !/https?:\/\//i.test(t))
          .map((t: string) => ({ text: t }))
      : []
    const normTags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: any) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean)
      : []

    // Basic shaping and defaults
    const result = {
      title: parsed.title || deriveTitleFromCaption(bestText) || meta?.title || "Onbekend recept",
      ingredients_json: normIngredients,
      steps_json: normSteps,
      tags: normTags,
      servings: typeof parsed.servings === "number" ? parsed.servings : null,
      prep_min: typeof parsed.prep_min === "number" ? parsed.prep_min : null,
      cook_min: typeof parsed.cook_min === "number" ? parsed.cook_min : null,
      image_url: parsed.image_url || oembed?.thumbnail_url || meta?.image || null,
    }

    // Final title cleanup: strip @handle, separators and trailing language/meta noise
    const cleanedTitle = deriveTitleFromCaption(result.title || undefined) || result.title
    if (cleanedTitle && cleanedTitle !== result.title) {
      result.title = cleanedTitle
    }

    // Sanitize obvious misclassifications and split long ingredient lines
    const sanitizedFromParsed = sanitizeIngredientsAndSteps(result.ingredients_json, result.steps_json, bestText)
    result.ingredients_json = sanitizedFromParsed.ingredients_json
    result.steps_json = sanitizedFromParsed.steps_json

    // If LLM returned empty arrays, enrich using basic parse from meta
    if ((!result.ingredients_json || result.ingredients_json.length === 0) || (!result.steps_json || result.steps_json.length === 0)) {
      const basic = basicParseFromText(bestText)
      if (result.ingredients_json.length === 0 && basic.ingredients_json.length > 0) {
        const s = sanitizeIngredientsAndSteps(basic.ingredients_json, result.steps_json, bestText)
        result.ingredients_json = s.ingredients_json
        result.steps_json = s.steps_json
      }
      if (result.steps_json.length === 0 && basic.steps_json.length > 0) {
        const s = sanitizeIngredientsAndSteps(result.ingredients_json, basic.steps_json, bestText)
        result.ingredients_json = s.ingredients_json
        result.steps_json = s.steps_json
      }
      // Merge tags
      result.tags = Array.from(new Set([...(result.tags || []), ...basic.tags]))
      // Prefer servings from LLM, else basic
      if (result.servings == null && basic.servings != null) result.servings = basic.servings
    }

    // Validate LLM output against caption; if mismatch, prefer caption parse
    const captionLower = (bestText || "").toLowerCase()
    const ingredientMatchCount = (Array.isArray(result.ingredients_json) ? result.ingredients_json : [])
      .filter((i) => typeof i?.name === "string" && i.name.trim().length > 0)
      .map((i) => i.name.toLowerCase())
      .filter((name) => captionLower.includes(name.split(/\s+/)[0] || name))
      .length
    const totalIngredients = (Array.isArray(result.ingredients_json) ? result.ingredients_json.length : 0)
    const overlapScore = totalIngredients > 0 ? ingredientMatchCount / totalIngredients : 0
    const looksLikeLasagna = /lasagn[a|e]/i.test(result.title || "") || (Array.isArray(result.tags) && result.tags.some((t) => /lasagn[a|e]/i.test(t)))

    if (bestText && (overlapScore < 0.3 || looksLikeLasagna)) {
      const basic = basicParseFromText(bestText)
      if (basic.ingredients_json.length > 0 || basic.steps_json.length > 0) {
        const s = sanitizeIngredientsAndSteps(basic.ingredients_json, basic.steps_json, bestText)
        result.ingredients_json = s.ingredients_json
        result.steps_json = s.steps_json
      }
      result.tags = Array.from(new Set([...(result.tags || []), ...basic.tags]))
      if (!result.servings && basic.servings) result.servings = basic.servings
      const derivedTitle = deriveTitleFromCaption(bestText)
      if (derivedTitle) result.title = derivedTitle
      ;(result as any).note = "LLM output kwam niet overeen met caption; fallback toegepast."
    }

    return NextResponse.json(result)
  } catch (e: any) {
    const minimal = {
      title: "Onbekend recept",
      ingredients_json: [],
      steps_json: [],
      tags: [] as string[],
      servings: null as number | null,
      prep_min: null as number | null,
      cook_min: null as number | null,
      image_url: null as string | null,
      error: e?.message || "Onbekende fout",
    }
    return NextResponse.json(minimal, { status: 200 })
  }
}