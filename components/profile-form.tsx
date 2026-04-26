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

const MAX_AVATAR_BYTES = 200 * 1024 // ~200KB once compressed

// Resize and compress an image File into a small Data URL using canvas.
async function compressImage(file: File, maxSize = 256): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => res(i)
    i.onerror = (e) => rej(e)
    i.src = dataUrl
  })
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.round(img.width * ratio)
  const h = Math.round(img.height * ratio)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", 0.82)
}

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
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(data.profile.displayName)
      setAvatar(data.profile.avatar)
    }
  }, [open, data.profile.displayName, data.profile.avatar])

  const onPick = async (file: File) => {
    try {
      const url = await compressImage(file)
      // Approximate size from data url
      if (url.length * 0.75 > MAX_AVATAR_BYTES * 4) {
        // very large still
      }
      setAvatar(url)
    } catch (err) {
      console.log("[v0] avatar error:", err)
    }
  }

  const submit = () => {
    updateProfile({ displayName: name.trim(), avatar })
    onOpenChange(false)
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
                onClick={() => setAvatar(undefined)}
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
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
