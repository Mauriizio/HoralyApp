"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { useAuth } from "@/lib/auth-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cleanupAvatar, uploadAvatar } from "@/lib/avatar-storage"
import { SessionIdentityMismatchError, type OperationIdentityContext } from "@/lib/session-identity"
import { validateAvatar } from "@/lib/auth-utils"

function initials(name: string) {
  if (!name.trim()) return ""
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
}

function safeProfileError(err: unknown) {
  return err instanceof Error ? err.message : "No se pudo guardar el perfil. Intenta nuevamente."
}

export function ProfileForm({
  open,
  onOpenChange,
  store,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  store: ScheduleStore
}) {
  const { t } = useI18n()
  const { data, updateProfileConfirmed } = store
  const [name, setName] = useState(data.profile.displayName)
  const [avatar, setAvatar] = useState<string | undefined>(data.profile.avatar)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [removeRequested, setRemoveRequested] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const { userId, authenticated, authGeneration, transitioning, verifyCurrentUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const revokePreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
  }

  useEffect(() => {
    if (open) {
      revokePreview()
      setName(data.profile.displayName)
      setAvatar(data.profile.avatar)
      setPendingFile(null)
      setRemoveRequested(false)
      setError("")
      setStatus("")
    }
  }, [open, data.profile.displayName, data.profile.avatar])

  useEffect(() => () => revokePreview(), [])

  const onPick = (file: File) => {
    if (saving || transitioning || !store.identityReady) return
    setStatus("Preparando imagen")
    const validation = validateAvatar(file)
    if (validation) {
      setError(validation)
      setStatus("")
      return
    }
    revokePreview()
    const previewUrl = URL.createObjectURL(file)
    previewUrlRef.current = previewUrl
    setPendingFile(file)
    setRemoveRequested(false)
    setAvatar(previewUrl)
    setError("")
  }

  const submit = async () => {
    if (saving || transitioning || !store.identityReady) return
    const operationUserId = userId
    const operationAuthGeneration = authGeneration
    const operationContext: OperationIdentityContext | undefined = operationUserId ? { expectedUserId: operationUserId, expectedAuthGeneration: operationAuthGeneration } : undefined
    const previousAvatar = data.profile.avatar
    let uploaded: Awaited<ReturnType<typeof uploadAvatar>> | null = null
    const assertOperationIdentity = async () => {
      if (!authenticated) return
      if (!operationUserId || store.dataOwnerUserId !== operationUserId || store.repositoryOwnerUserId !== operationUserId) throw new SessionIdentityMismatchError()
      const verifiedUser = await verifyCurrentUser()
      if (verifiedUser.id !== operationUserId || authGeneration !== operationAuthGeneration) throw new SessionIdentityMismatchError()
    }
    setSaving(true)
    setError("")
    try {
      let nextAvatar = removeRequested ? undefined : previousAvatar
      const supabase = createSupabaseBrowserClient()
      await assertOperationIdentity()
      if (authenticated && operationUserId && supabase && pendingFile) {
        setStatus("Subiendo imagen")
        uploaded = await uploadAvatar(supabase, operationUserId, pendingFile)
        nextAvatar = uploaded.publicUrl
        await assertOperationIdentity()
      }
      setStatus("Guardando perfil")
      await updateProfileConfirmed({ displayName: name.trim(), avatar: nextAvatar }, operationContext)
      await assertOperationIdentity()
      revokePreview()
      setAvatar(nextAvatar)
      if (authenticated && operationUserId && supabase) {
        if (pendingFile && previousAvatar) {
          setStatus("Limpiando avatar anterior")
          await cleanupAvatar(supabase, operationUserId, previousAvatar)
        } else if (removeRequested && previousAvatar) {
          setStatus("Limpiando avatar anterior")
          await cleanupAvatar(supabase, operationUserId, previousAvatar)
        }
      }
      setStatus("Guardado")
      onOpenChange(false)
    } catch (err) {
      if (uploaded && operationUserId) {
        const supabase = createSupabaseBrowserClient()
        if (supabase) await cleanupAvatar(supabase, operationUserId, uploaded.path)
      }
      setAvatar(previousAvatar)
      setError(err instanceof SessionIdentityMismatchError ? "La sesión cambió durante la operación. Vuelve a intentarlo." : safeProfileError(err))
      setStatus("")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAvatar = () => {
    if (saving || transitioning || !store.identityReady) return
    revokePreview()
    setPendingFile(null)
    setRemoveRequested(true)
    setAvatar(undefined)
    setError("")
  }

  return (
    <Dialog open={open && !transitioning && store.identityReady} onOpenChange={(nextOpen) => { if (!saving && !transitioning && store.identityReady) onOpenChange(nextOpen) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.editProfile")}</DialogTitle>
          <DialogDescription>{t("profile.title")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatar ? <AvatarImage key={avatar} src={avatar} alt={name || "Avatar"} /> : null}
            <AvatarFallback
              className="text-base font-semibold"
              style={
                initials(name)
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : undefined
              }
            >
              {initials(name) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || transitioning || !store.identityReady}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {t("profile.uploadAvatar")}
            </Button>
            {avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving || transitioning || !store.identityReady}
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t("profile.removeAvatar")}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={saving || transitioning || !store.identityReady}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPick(f)
                e.target.value = ""
              }}
            />
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="display-name">{t("profile.displayName")}</FieldLabel>
            <Input
              id="display-name"
              value={name}
              disabled={saving || transitioning || !store.identityReady}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              placeholder="—"
            />
            <FieldDescription>
              {t("profile.greeting", { name: name || "…" })}
            </FieldDescription>
            {status && <p className="text-sm text-muted-foreground" aria-live="polite">{status}</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" disabled={saving || transitioning || !store.identityReady} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving || transitioning || !store.identityReady}>{saving ? (status || "Guardando...") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
