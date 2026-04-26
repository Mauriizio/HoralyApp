"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Sun, CloudSun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useI18n } from "@/components/i18n-provider"
import { MODULE_PRESETS, type TimeModule } from "@/lib/types"
import { validateModules } from "@/hooks/use-schedule-store"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function TimeModulesEditor({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, addModule, updateModule, deleteModule, setModules } = store
  const { modules } = data

  const [draftStart, setDraftStart] = useState("13:40")
  const [draftEnd, setDraftEnd] = useState("14:25")
  const [draftLabel, setDraftLabel] = useState("")

  const validationErr = useMemo(() => validateModules(modules), [modules])

  const applyPreset = (id: "morning" | "afternoon" | "evening") => {
    const preset = MODULE_PRESETS.find((p) => p.id === id)
    if (!preset) return
    if (modules.length > 0) {
      const ok = window.confirm(t("settings.modules.preset.applyConfirm"))
      if (!ok) return
    }
    setModules(preset.modules.map((m, i) => ({ ...m, label: `${t("schedule.module")} ${i + 1}` })))
  }

  const sorted = modules.slice().sort((a, b) => a.start.localeCompare(b.start))

  const onAdd = () => {
    if (!draftStart || !draftEnd || draftStart >= draftEnd) return
    addModule({
      start: draftStart,
      end: draftEnd,
      label: draftLabel || `${t("schedule.module")} ${modules.length + 1}`,
    })
    setDraftLabel("")
  }

  const onModuleChange = (m: TimeModule, patch: Partial<TimeModule>) => {
    updateModule(m.id, patch)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.modules")}</CardTitle>
        <CardDescription>{t("settings.modules.help")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset("morning")}>
            <Sun className="h-4 w-4 mr-1.5" />
            {t("settings.modules.preset.morning")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("afternoon")}>
            <CloudSun className="h-4 w-4 mr-1.5" />
            {t("settings.modules.preset.afternoon")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("evening")}>
            <Moon className="h-4 w-4 mr-1.5" />
            {t("settings.modules.preset.evening")}
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
              {t("common.empty")}
            </div>
          )}
          {sorted.map((m, idx) => (
            <div
              key={m.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-md border bg-card px-2 py-1.5"
            >
              <span className="font-mono text-xs text-muted-foreground w-6 text-center">
                {idx + 1}
              </span>
              <Input
                aria-label={`${t("schedule.module")} ${idx + 1}`}
                value={m.label}
                onChange={(e) => onModuleChange(m, { label: e.target.value })}
                className="h-8"
              />
              <Input
                type="time"
                aria-label={t("study.start")}
                value={m.start}
                onChange={(e) => onModuleChange(m, { start: e.target.value })}
                className="h-8 w-[110px]"
              />
              <Input
                type="time"
                aria-label={t("study.end")}
                value={m.end}
                onChange={(e) => onModuleChange(m, { end: e.target.value })}
                className="h-8 w-[110px]"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteModule(m.id)}
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {validationErr && (
          <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {validationErr === "range"
              ? t("settings.modules.error.range")
              : t("settings.modules.error.overlap")}
          </div>
        )}

        {/* Add new */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
          <FieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="new-mod-label">{t("schedule.module")}</FieldLabel>
                <Input
                  id="new-mod-label"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder={`${t("schedule.module")} ${modules.length + 1}`}
                  className="h-9"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-mod-start">{t("study.start")}</FieldLabel>
                <Input
                  id="new-mod-start"
                  type="time"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="h-9"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-mod-end">{t("study.end")}</FieldLabel>
                <Input
                  id="new-mod-end"
                  type="time"
                  value={draftEnd}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="h-9"
                />
              </Field>
            </div>
          </FieldGroup>
          <Button size="sm" onClick={onAdd} disabled={draftStart >= draftEnd}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("settings.modules.add")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
