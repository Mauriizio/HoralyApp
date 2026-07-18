"use client"

import { useMemo, useState } from "react"
import { Moon, Sun, Monitor, UserPen, User, Languages, LogIn, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { useI18n } from "@/components/i18n-provider"
import { ProfileForm } from "@/components/profile-form"
import { InstallAppButton } from "@/components/install-app-button"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import Link from "next/link"
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"

function initials(name: string) {
  if (!name.trim()) return ""
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
}

export function ProfileButton({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { data, updateSettings } = store
  const cloudConfigured = isSupabaseConfigured()
  const { profile, settings } = data

  const isDark = useMemo(() => {
    if (settings.theme === "dark") return true
    if (settings.theme === "light") return false
    if (typeof window !== "undefined")
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    return false
  }, [settings.theme])

  const displayInitials = initials(profile.displayName)
  const { canPrompt, showInstructions, installed } = usePwaInstall()
  const showInstall = !installed && (canPrompt || showInstructions)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("profile.title")}
            title={profile.displayName || t("profile.title")}
            className="rounded-full ring-2 ring-transparent hover:ring-primary/30 focus-visible:ring-ring transition outline-none shrink-0"
          >
            <Avatar className="h-9 w-9">
              {profile.avatar ? (
                <AvatarImage src={profile.avatar} alt={profile.displayName || "Avatar"} />
              ) : null}
              <AvatarFallback
                className="text-xs font-semibold"
                style={{
                  backgroundColor: displayInitials
                    ? "var(--primary)"
                    : "color-mix(in oklch, var(--primary) 18%, var(--card))",
                  color: displayInitials
                    ? "var(--primary-foreground)"
                    : "var(--primary)",
                }}
              >
                {displayInitials || <User className="h-4 w-4" aria-hidden />}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-72 p-3 space-y-3">
          {/* Header card */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              {profile.avatar ? (
                <AvatarImage src={profile.avatar} alt={profile.displayName || "Avatar"} />
              ) : null}
              <AvatarFallback
                className="text-sm font-semibold"
                style={{
                  backgroundColor: displayInitials
                    ? "var(--primary)"
                    : "color-mix(in oklch, var(--primary) 18%, var(--card))",
                  color: displayInitials
                    ? "var(--primary-foreground)"
                    : "var(--primary)",
                }}
              >
                {displayInitials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {profile.displayName || t("profile.greetingAnon")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("profile.editProfile")}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setEditOpen(true)
              setOpen(false)
            }}
          >
            <UserPen className="h-4 w-4 mr-1.5" />
            {t("profile.editProfile")}
          </Button>

          <Separator />
          {cloudConfigured ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={async () => {
                await createSupabaseBrowserClient()?.auth.signOut()
                setOpen(false)
                location.reload()
              }}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Cerrar sesión
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/auth/login"><LogIn className="h-4 w-4 mr-1.5" />Iniciar sesión</Link>
            </Button>
          )}

          <Separator />

          {/* Theme section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-0.5">
              <Sun className="h-3 w-3" />
              {t("settings.theme")}
            </div>
            <div role="group" aria-label={t("settings.theme")} className="grid grid-cols-3 gap-1.5">
              <Button
                variant={!isDark && settings.theme === "light" ? "default" : "outline"}
                size="sm"
                aria-pressed={settings.theme === "light"}
                aria-label={t("profile.themeLight")}
                onClick={() => updateSettings({ theme: "light" })}
                className="px-2"
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={isDark && settings.theme === "dark" ? "default" : "outline"}
                size="sm"
                aria-pressed={settings.theme === "dark"}
                aria-label={t("profile.themeDark")}
                onClick={() => updateSettings({ theme: "dark" })}
                className="px-2"
              >
                <Moon className="h-4 w-4" />
              </Button>
              <Button
                variant={settings.theme === "system" ? "default" : "outline"}
                size="sm"
                aria-pressed={settings.theme === "system"}
                aria-label={t("settings.themeSystem")}
                onClick={() => updateSettings({ theme: "system" })}
                className="px-2"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Language section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-0.5">
              <Languages className="h-3 w-3" />
              {t("settings.language")}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant={settings.language === "es" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings({ language: "es" })}
                aria-pressed={settings.language === "es"}
              >
                Español
              </Button>
              <Button
                variant={settings.language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings({ language: "en" })}
                aria-pressed={settings.language === "en"}
              >
                English
              </Button>
            </div>
          </div>

          {/* Install app shortcut (only when actually installable) */}
          {showInstall && (
            <>
              <Separator />
              <InstallAppButton
                variant="outline"
                size="sm"
                className="w-full justify-start"
              />
            </>
          )}
        </PopoverContent>
      </Popover>

      <ProfileForm open={editOpen} onOpenChange={setEditOpen} store={store} />
    </>
  )
}
