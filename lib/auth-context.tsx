"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
  const currentUserIdRef = useRef<string | null>(null)
  const sessionResolvedRef = useRef(false)

  const applySession = useCallback((nextSession: Session | null, authEvent: string) => {
    const previousUserId = currentUserIdRef.current
    const nextUserId = nextSession?.user?.id ?? null
    const identityChanged = previousUserId !== nextUserId

    currentUserIdRef.current = nextUserId
    sessionResolvedRef.current = true

    // Supabase may emit SIGNED_IN again when an existing session is confirmed or
    // re-established. Re-hydrating the whole workspace for the same user causes
    // dialogs/forms to close and makes the app feel as if the session restarted.
    // Only a real identity boundary advances the generation.
    if (identityChanged) {
      setAuthGeneration((value) => value + 1)
      logIdentity({ authEvent, authUserId: nextUserId, operation: "auth.applySession" })
    }

    setSession(nextSession)
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

    // A slow refresh/network must not be interpreted as a real sign-out. We stop
    // blocking the UI after a bounded wait, but keep listening for the real auth
    // event instead of replacing a valid stored session with null.
    const initialSessionTimer = window.setTimeout(() => {
      if (!mounted || sessionResolvedRef.current) return
      setLoading(false)
      setTransitioning(false)
      logIdentity({ authEvent: "INITIAL_SESSION_TIMEOUT", operation: "auth.initialSession" })
    }, 8000)

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || sessionResolvedRef.current) return
      if (error) {
        setLoading(false)
        setTransitioning(false)
        logIdentity({ authEvent: "INITIAL_SESSION_ERROR", operation: "auth.initialSession" })
        return
      }
      applySession(data.session, "INITIAL_SESSION")
    }).catch(() => {
      if (!mounted || sessionResolvedRef.current) return
      setLoading(false)
      setTransitioning(false)
      logIdentity({ authEvent: "INITIAL_SESSION_ERROR", operation: "auth.initialSession" })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      applySession(nextSession, event)
    })

    return () => {
      mounted = false
      window.clearTimeout(initialSessionTimer)
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
    const { error } = await supabase.auth.signOut()
    if (error) {
      setTransitioning(false)
      throw error
    }
    // onAuthStateChange normally applies SIGNED_OUT first; this fallback keeps the
    // local provider coherent if the callback arrives late. It does not double
    // increment authGeneration because identityChanged will already be false.
    applySession(null, "SIGNED_OUT")
  }, [applySession, supabase])

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
