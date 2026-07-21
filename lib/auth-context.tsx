"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { logIdentity, SessionIdentityMismatchError } from "@/lib/session-identity"

type AuthContextValue = {
  user: User | null
  userId: string | null
  session: Session | null
  loading: boolean
  transitioning: boolean
  authGeneration: number
  authenticated: boolean
  verifyCurrentUser: () => Promise<User>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [transitioning, setTransitioning] = useState(Boolean(supabase))
  const [authGeneration, setAuthGeneration] = useState(0)

  const applySession = useCallback((nextSession: Session | null, authEvent: string) => {
    setTransitioning(true)
    setSession((previous) => {
      const previousUserId = previous?.user?.id ?? null
      const nextUserId = nextSession?.user?.id ?? null
      if (previousUserId !== nextUserId || ["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(authEvent)) {
        setAuthGeneration((value) => value + 1)
        logIdentity({ authEvent, authUserId: nextUserId, operation: "auth.applySession" })
      }
      return nextSession
    })
    setLoading(false)
    setTransitioning(false)
  }, [])

  useEffect(() => {
    let mounted = true
    if (!supabase) {
      setLoading(false)
      setTransitioning(false)
      return
    }
    setTransitioning(true)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      applySession(data.session, "INITIAL_SESSION")
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      applySession(nextSession, event)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [applySession, supabase])

  const verifyCurrentUser = useCallback(async () => {
    if (!supabase) throw new SessionIdentityMismatchError()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new SessionIdentityMismatchError()
    logIdentity({ authEvent: "VERIFY_USER", authUserId: session?.user?.id ?? null, verifiedUserId: data.user.id, authGeneration, operation: "auth.verifyCurrentUser" })
    return data.user
  }, [authGeneration, session?.user?.id, supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setTransitioning(true)
    setSession(null)
    setAuthGeneration((value) => value + 1)
    logIdentity({ authEvent: "SIGNED_OUT", operation: "auth.signOut" })
    await supabase.auth.signOut()
    setSession(null)
    setAuthGeneration((value) => value + 1)
    setLoading(false)
    setTransitioning(false)
  }, [supabase])

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    session,
    loading,
    transitioning,
    authGeneration,
    authenticated: Boolean(session?.user),
    verifyCurrentUser,
    signOut,
  }), [authGeneration, loading, session, signOut, transitioning, verifyCurrentUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.")
  return value
}
