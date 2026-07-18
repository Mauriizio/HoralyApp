import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseBrowserConfig } from "./config"

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const { url, anonKey, isConfigured } = getSupabaseBrowserConfig()
  if (!isConfigured || !url || !anonKey) return null
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any))
        } catch {}
      },
    },
  })
}
