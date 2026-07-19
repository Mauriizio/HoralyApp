export function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = publishableKey || anonKey
  return { url, anonKey: key, publishableKey, isConfigured: Boolean(url && key) }
}

export function assertNoServiceRoleKey() {
  if (typeof window !== "undefined" && "SUPABASE_SERVICE_ROLE_KEY" in process.env) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no debe exponerse al cliente.")
  }
}
