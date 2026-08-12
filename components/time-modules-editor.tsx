"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Sun, CloudSun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useI18n } from "@/components/i18n-provider"
import { MODULE_PRESET_SEEDS, type TimeModule } from "@/lib/types"
import { validateModules } from "@/lib/time-modules"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

function countAffectedBlocks(blocks: ScheduleStore["data"]["blocks"], nextModules: TimeModule[]): number {
  const validIds = new Set(nextModules.map((module) => module.id))
  return blocks.filter((block) => block.moduleIds.some((moduleId) => !validIds.has(moduleId))).length
}

export function TimeModulesEditor({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, addModule, updateModule, deleteModule, setModules } = store
  const { modules, blocks } = data

  const [draftStart, setDraftStart] = useState("13:40")
  const [draftEnd, setDraftEnd] = useState("14:25")
  const [draftLabel, setDraftLabel] = useState("")

  const validationErr = useMemo(() => validateModules(modules), [modules])

  const confirmAffectedBlocks = (nextModules: TimeModule[]) => {
    const affected = countAffectedBlocks(blocks, nextModules)
    if (affected === 0) return true
    return window.confirm(
      `Este cambio quitará referencias horarias de ${affected} bloque(s). Se conservarán los bloques que aún tengan módulos válidos. ¿Continuar?`,
    )
  }

  const applyPreset = (id: "morning" | "afternoon" | "evening") => {
    const seed = MODULE_PRESET_SEEDS[id]
    const nextModules = [{ ...seed, id: `${id}-${crypto.randomUUID()}` }]
    if (modules.length > 0) {
      setDraftStart(seed.start); setDraftEnd(seed.end); setDraftLabel(`${t("schedule.module")} ${modules.length + 1}`)
      return
    }
    if (!confirmAffectedBlocks(nextModules)) return
    setModules(nextModules)
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

  const onDelete = (moduleId: string) => {
    const nextModules = modules.filter((module) => module.id !== moduleId)
    if (!confirmAffectedBlocks(nextModules)) return
    deleteModule(moduleId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.modules")}</CardTitle>
        <CardDescription>{t("settings.modules.help")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
              {t("common.empty")}
            </div>
          )}
          {sorted.map((m, idx) => <TimeModuleDraftRow key={m.id} module={m} index={idx} onSave={(draft) => updateModule(m.id, draft)} onDelete={() => onDelete(m.id)} />)}
        </div>

        {validationErr && (
          <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {validationErr === "range"
              ? t("settings.modules.error.range")
              : validationErr === "overlap"
                ? t("settings.modules.error.overlap")
                : "Los módulos deben tener formato e identificadores válidos."}
          </div>
        )}

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
                <Input id="new-mod-start" type="time" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="h-9" />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-mod-end">{t("study.end")}</FieldLabel>
                <Input id="new-mod-end" type="time" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="h-9" />
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

function TimeModuleDraftRow({ module, index, onSave, onDelete }: { module: TimeModule; index: number; onSave: (draft: TimeModule) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(module)
  const [error, setError] = useState("")
  return <div className="grid gap-2 rounded-md border bg-card p-2 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center"><span className="w-6 text-center font-mono text-xs text-muted-foreground">{index + 1}</span><Input aria-label={`Módulo ${index + 1}`} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className="h-9" /><Input type="time" aria-label="Inicio" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} className="h-9 sm:w-[110px]" /><Input type="time" aria-label="Fin" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} className="h-9 sm:w-[110px]" /><div className="flex gap-1"><Button size="sm" onClick={() => { if (draft.start >= draft.end) { setError("La hora de término debe ser posterior al inicio."); return } setError(""); onSave(draft) }}>Guardar</Button><Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar módulo"><Trash2 className="size-4" /></Button></div>{error && <p className="text-xs text-destructive sm:col-start-3 sm:col-span-3">{error}</p>}</div>
}
