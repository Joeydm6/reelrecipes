import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1"
  const model = process.env.LM_STUDIO_MODEL || null

  try {
    const res = await fetch(`${baseUrl}/models`, { cache: "no-store" })
    if (!res.ok) {
      const text = await res.text().catch(() => "onbekende fout")
      return NextResponse.json(
        { status: "down", baseUrl, model, error: `HTTP ${res.status}: ${text}` },
        { status: 200 },
      )
    }
    const json = await res.json().catch(() => null)
    const models: string[] = Array.isArray(json?.data)
      ? json.data.map((m: any) => m?.id).filter((x: any) => typeof x === "string")
      : []
    const selectedAvailable = model ? models.includes(model) : true
    return NextResponse.json(
      {
        status: "up",
        baseUrl,
        model,
        selectedAvailable,
        availableModels: models.slice(0, 10),
      },
      { status: 200 },
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        status: "down",
        baseUrl,
        model,
        error: e?.message || "Kon LM Studio endpoint niet bereiken",
      },
      { status: 200 },
    )
  }
}