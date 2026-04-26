"use client"

import { useEffect } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  BookOpen,
  Bell,
  BookMarked,
  Sun,
  Moon,
  Monitor,
  Zap,
  GraduationCap,
} from "lucide-react"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { useI18n } from "@/components/i18n-provider"

export type QuickAction =
  | "new-subject"
  | "new-reminder"
  | "new-study-block"
  | "new-grade"
  | "toggle-focus"
  | "theme-light"
  | "theme-dark"
  | "theme-system"

interface QuickAddProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: QuickAction) => void
  store: ScheduleStore
}

export function QuickAdd({ open, onOpenChange, onAction, store }: QuickAddProps) {
  const { t } = useI18n()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("quick.title")}
      description={t("quick.placeholder")}
    >
      <CommandInput placeholder={t("quick.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("common.empty")}</CommandEmpty>
        <CommandGroup heading={t("quick.group.create")}>
          <CommandItem onSelect={() => onAction("new-subject")}>
            <BookOpen className="h-4 w-4 mr-2" />
            {t("quick.newSubject")}
          </CommandItem>
          <CommandItem onSelect={() => onAction("new-reminder")}>
            <Bell className="h-4 w-4 mr-2" />
            {t("quick.newReminder")}
          </CommandItem>
          <CommandItem onSelect={() => onAction("new-study-block")}>
            <BookMarked className="h-4 w-4 mr-2" />
            {t("quick.newStudyBlock")}
          </CommandItem>
          <CommandItem onSelect={() => onAction("new-grade")}>
            <GraduationCap className="h-4 w-4 mr-2" />
            {t("quick.newGrade")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("quick.group.view")}>
          <CommandItem onSelect={() => onAction("toggle-focus")}>
            <Zap className="h-4 w-4 mr-2" />
            {t("quick.toggleFocus")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("quick.group.theme")}>
          <CommandItem onSelect={() => onAction("theme-light")}>
            <Sun className="h-4 w-4 mr-2" />
            {t("quick.themeLight")}
          </CommandItem>
          <CommandItem onSelect={() => onAction("theme-dark")}>
            <Moon className="h-4 w-4 mr-2" />
            {t("quick.themeDark")}
          </CommandItem>
          <CommandItem onSelect={() => onAction("theme-system")}>
            <Monitor className="h-4 w-4 mr-2" />
            {t("quick.themeSystem")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
