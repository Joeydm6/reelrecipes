import { NextResponse } from "next/server"

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + pad, "base64")
}

function safeJsonParse<T = any>(s: string): T | null {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function verifySignedRequest(signed: string, appSecret?: string) {
  try {
    const [sigB64, payloadB64] = signed.split(".")
    if (!sigB64 || !payloadB64) return { valid: false, payload: null }
    const payloadBuf = base64UrlDecode(payloadB64)
    const payloadJson = safeJsonParse<any>(payloadBuf.toString("utf8"))
    if (!appSecret) return { valid: false, payload: payloadJson }
    // HMAC SHA256 verification per Meta spec
    const crypto = require("crypto")
    const expected = crypto.createHmac("sha256", appSecret).update(payloadB64).digest()
    const sigBuf = base64UrlDecode(sigB64)
    const valid = expected.length === sigBuf.length && crypto.timingSafeEqual(expected, sigBuf)
    return { valid, payload: payloadJson }
  } catch {
    return { valid: false, payload: null }
  }
}

function appBaseUrl() {
  // Prefer explicit public base URL, fallback to localhost
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL
  return (envUrl && envUrl.trim().length > 0) ? envUrl.trim().replace(/\/$/, "") : "http://localhost:3000"
}

export async function POST(req: Request) {
  // Facebook/Meta will POST with application/x-www-form-urlencoded containing signed_request
  let signed: string | null = null
  let userId: string | null = null

  // Try to parse urlencoded body
  const text = await req.text().catch(() => "")
  if (text && /\w+=/.test(text)) {
    const params = new URLSearchParams(text)
    signed = params.get("signed_request")
  }
  // Fallback: JSON body
  if (!signed) {
    try {
      const json = JSON.parse(text)
      if (json && typeof json.signed_request === "string") signed = json.signed_request
    } catch {
      // ignore
    }
  }

  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET
  let confirmationCode = `rr-delete-${Date.now()}`
  if (signed) {
    const { valid, payload } = verifySignedRequest(signed, appSecret)
    userId = payload?.user_id ? String(payload.user_id) : null
    if (userId) confirmationCode = `rr-delete-${userId}-${Date.now()}`
    // In een echte app zou je hier je verwijderlogica starten of inplannen.
    // Bijvoorbeeld: markeer account voor verwijdering en verwijder alle gerelateerde data.
  }

  const url = `${appBaseUrl()}/data-deletion`
  // Vereist door Meta: JSON met minstens url en confirmation_code
  return NextResponse.json({ url, confirmation_code: confirmationCode, user_id: userId }, { status: 200 })
}

export async function GET() {
  // Optioneel: faciliteer snelle controle
  const url = `${appBaseUrl()}/data-deletion`
  return NextResponse.json({ status: "ok", instructions_url: url }, { status: 200 })
}