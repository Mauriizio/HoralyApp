"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  dayLabel,
  difficultyLabel,
  priorityLabel,
  translate,
  type TranslationKey,
} from "@/lib/i18n"
import type { DayKey, DifficultyLevel, Language, ReminderPriority } from "@/lib/types"

interface I18nContextValue {
  lang: Language
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  day: (d: DayKey, short?: boolean) => string
  difficulty: (level: DifficultyLevel) => string
  priority: (p: ReminderPriority) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      day: (d, short) => dayLabel(lang, d, short),
      difficulty: (level) => difficultyLabel(lang, level),
      priority: (p) => priorityLabel(lang, p),
    }),
    [lang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback: default to Spanish if used outside the provider.
    return {
      lang: "es",
      t: (key, vars) => translate("es", key, vars),
      day: (d, short) => dayLabel("es", d, short),
      difficulty: (level) => difficultyLabel("es", level),
      priority: (p) => priorityLabel("es", p),
    }
  }
  return ctx
}
