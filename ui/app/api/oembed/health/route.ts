import { NextResponse } from "next/server"

export async function GET() {
  const version = process.env.INSTAGRAM_OEMBED_GRAPH_VERSION || "v19.0"
  const token = process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN || null
  const sampleUrl = "https://www.instagram.com/p/DPWhzrGEaHU/"
  const api = token
    ? `https://graph.facebook.com/${version}/instagram_oembed?url=${encodeURIComponent(sampleUrl)}&access_token=${encodeURIComponent(token)}`
    : null

  if (!token) {
    return NextResponse.json({ status: "missing", version, hasToken: false }, { status: 200 })
  }

  try {
    const res = await fetch(api!, { cache: "no-store" })
    if (!res.ok) {
      const text = await res.text().catch(() => "onbekende fout")
      return NextResponse.json(
        { status: "error", version, hasToken: true, http: res.status, message: text.slice(0, 400) },
        { status: 200 },
      )
    }
    const json = await res.json().catch(() => null)
    return NextResponse.json(
      {
        status: "up",
        version,
        hasToken: true,
        author_name: json?.author_name ?? null,
        thumbnail_url: json?.thumbnail_url ?? null,
        title: typeof json?.title === "string" ? json.title : null,
      },
      { status: 200 },
    )
  } catch (e: any) {
    return NextResponse.json(
      { status: "down", version, hasToken: true, error: e?.message || "Kon Graph API niet bereiken" },
      { status: 200 },
    )
  }
}