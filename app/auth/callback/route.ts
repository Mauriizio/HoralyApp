import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { classifyCallbackError } from "@/lib/auth-flow"
import { safeInternalRedirect } from "@/lib/auth-url"

function statusUrl(origin: string, code: string) {
  return new URL(`/auth/status?code=${code}`, origin)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeInternalRedirect(url.searchParams.get("next"), "/")
  const directError = classifyCallbackError(url.searchParams)
  if (directError) return NextResponse.redirect(statusUrl(url.origin, directError))
  if (!code) return NextResponse.redirect(statusUrl(url.origin, "invalid-link"))
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.redirect(statusUrl(url.origin, "callback-failed"))
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  const exchangeStatus = classifyCallbackError(url.searchParams, error)
  if (exchangeStatus) return NextResponse.redirect(statusUrl(url.origin, exchangeStatus))
  return NextResponse.redirect(new URL(next, url.origin))
}
