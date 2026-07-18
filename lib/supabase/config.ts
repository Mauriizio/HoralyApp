export function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, anonKey, isConfigured: Boolean(url && anonKey) }
}

export function assertNoServiceRoleKey() {
  if (typeof window !== "undefined" && "SUPABASE_SERVICE_ROLE_KEY" in process.env) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no debe exponerse al cliente.")
  }
}
