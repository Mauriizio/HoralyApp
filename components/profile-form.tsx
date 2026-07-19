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
import { removeAvatar, uploadAvatar } from "@/lib/avatar-storage"
import { validateAvatar } from "@/lib/auth-utils"

function initials(name: string) {
  if (!name.trim()) return ""
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
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
  const { data, updateProfile } = store
  const [name, setName] = useState(data.profile.displayName)
  const [avatar, setAvatar] = useState<string | undefined>(data.profile.avatar)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const { user, authenticated } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(data.profile.displayName)
      setAvatar(data.profile.avatar)
      setPendingFile(null)
      setError("")
    }
  }, [open, data.profile.displayName, data.profile.avatar])

  const onPick = (file: File) => {
    const validation = validateAvatar(file)
    if (validation) {
      setError(validation)
      return
    }
    setPendingFile(file)
    setAvatar(URL.createObjectURL(file))
    setError("")
  }

  const submit = async () => {
    setSaving(true)
    setError("")
    try {
      let nextAvatar = avatar
      const supabase = createSupabaseBrowserClient()
      if (authenticated && user && supabase && pendingFile) {
        const uploaded = await uploadAvatar(supabase, user.id, pendingFile)
        nextAvatar = uploaded.publicUrl
      }
      updateProfile({ displayName: name.trim(), avatar: nextAvatar })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setPendingFile(null)
    setAvatar(undefined)
    const supabase = createSupabaseBrowserClient()
    if (authenticated && user && supabase) {
      try { await removeAvatar(supabase, user.id) } catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar el avatar.") }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.editProfile")}</DialogTitle>
          <DialogDescription>{t("profile.title")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatar ? <AvatarImage src={avatar} alt={name || "Avatar"} /> : null}
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
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t("profile.removeAvatar")}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onPick(f)
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
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              placeholder="—"
            />
            <FieldDescription>
              {t("profile.greeting", { name: name || "…" })}
            </FieldDescription>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
