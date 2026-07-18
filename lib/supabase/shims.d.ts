declare module "@supabase/ssr" {
  export function createBrowserClient(url: string, key: string): import("@supabase/supabase-js").SupabaseClient
  export function createServerClient(url: string, key: string, options: unknown): import("@supabase/supabase-js").SupabaseClient
}

declare module "@supabase/supabase-js" {
  export type SupabaseClient = any
}
