"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useI18n } from "@/components/i18n-provider"
import { GRADE_SCALE_PRESETS, type GradeScale, type GradeScalePresetId } from "@/lib/types"
import { hasGradesOutsideScale } from "@/lib/storage"
import type { ScheduleStore } from "@/hooks/use-schedule-store"

export function GradeScaleEditor({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, updateSettings } = store
  const { gradeScale } = data.settings

  const activePreset = useMemo<GradeScalePresetId>(() => {
    for (const p of GRADE_SCALE_PRESETS) {
      if (p.id === "custom") continue
      if (
        p.scale.min === gradeScale.min &&
        p.scale.max === gradeScale.max &&
        p.scale.passing === gradeScale.passing
      )
        return p.id
    }
    return "custom"
  }, [gradeScale])

  const applyScale = (nextScale: GradeScale) => {
    if (data.grades.length > 0 && hasGradesOutsideScale(data, nextScale)) {
      window.alert(
        "No se puede aplicar esta escala porque existen notas históricas fuera del nuevo rango. La conversión por semestre se implementará posteriormente.",
      )
      return
    }
    updateSettings({ gradeScale: nextScale })
  }

  const applyPreset = (id: GradeScalePresetId) => {
    const preset = GRADE_SCALE_PRESETS.find((p) => p.id === id)
    if (!preset) return
    applyScale(preset.scale)
  }

  const setField = (key: "min" | "max" | "passing", value: number) => {
    if (Number.isNaN(value)) return
    const next = { ...gradeScale, [key]: value }
    if (next.min >= next.max) return
    if (next.passing < next.min || next.passing > next.max) return
    applyScale(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.gradeScale")}</CardTitle>
        <CardDescription>{t("settings.gradeScale.help")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {GRADE_SCALE_PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={activePreset === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p.id)}
            >
              {t(`settings.gradeScale.preset.${p.id}` as const)}
            </Button>
          ))}
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field>
              <FieldLabel htmlFor="scale-min">{t("settings.gradeScale.min")}</FieldLabel>
              <Input
                id="scale-min"
                type="number"
                step="0.1"
                value={gradeScale.min}
                onChange={(e) => setField("min", parseFloat(e.target.value))}
                className="h-9"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="scale-max">{t("settings.gradeScale.max")}</FieldLabel>
              <Input
                id="scale-max"
                type="number"
                step="0.1"
                value={gradeScale.max}
                onChange={(e) => setField("max", parseFloat(e.target.value))}
                className="h-9"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="scale-pass">{t("settings.gradeScale.passing")}</FieldLabel>
              <Input
                id="scale-pass"
                type="number"
                step="0.1"
                value={gradeScale.passing}
                onChange={(e) => setField("passing", parseFloat(e.target.value))}
                className="h-9"
              />
            </Field>
          </div>
        </FieldGroup>

        <div className="text-xs text-muted-foreground">
          {t("grade.scale", {
            min: gradeScale.min,
            max: gradeScale.max,
            passing: gradeScale.passing,
          })}
        </div>
      </CardContent>
    </Card>
  )
}
