import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseBrowserConfig, assertNoServiceRoleKey } from "./config"

let browserClient: SupabaseClient | null = null

export function isSupabaseConfigured() {
  return getSupabaseBrowserConfig().isConfigured
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  assertNoServiceRoleKey()
  const { url, anonKey, isConfigured } = getSupabaseBrowserConfig()
  if (!isConfigured || !url || !anonKey) return null
  browserClient ??= createBrowserClient(url, anonKey)
  return browserClient
}
