"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/components/i18n-provider"
import type { AssessmentGroup, Grade, GradeScale, Subject } from "@/lib/types"
import { isScoreInScale, isValidWeight } from "@/lib/grade-utils"
import { getMaximumAssessmentWeight, isActiveAssessmentGroup, isStandardSingleAssessmentFinalGroup } from "@/lib/assessment-groups"

interface GradeFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  subjects: Subject[]
  groups?: AssessmentGroup[]
  assessments?: Grade[]
  scale: GradeScale
  initial?: Grade
  defaultSubjectId?: string
  defaultGroupId?: string
  lockSubject?: boolean
  onApplyTwoGroupPreset?: (subjectId: string) => void
  onSubmit: (values: Omit<Grade, "id" | "createdAt">) => void
}

function todayIso() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function GradeForm({
  open,
  onOpenChange,
  subjects,
  groups = [],
  assessments = [],
  scale,
  initial,
  defaultSubjectId,
  defaultGroupId,
  lockSubject = false,
  onApplyTwoGroupPreset,
  onSubmit,
}: GradeFormProps) {
  const { t } = useI18n()
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [score, setScore] = useState<string>(initial?.score?.toString() ?? "")
  const [weight, setWeight] = useState<string>(initial?.weight?.toString() ?? "20")
  const [date, setDate] = useState(initial?.date ?? todayIso())
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [groupId, setGroupId] = useState(initial?.groupId ?? "")
  const availableGroups = groups.filter((group) => group.subjectId === subjectId && isActiveAssessmentGroup(group))
  const selectedSubject = subjects.find((subject) => subject.id === subjectId)
  const hasTransversalGroup = availableGroups.some((group) => group.kind === "final_exam")
  const selectedGroup = availableGroups.find((group) => group.id === groupId)
  const groupAssessments = assessments.filter((assessment) => assessment.groupId === groupId)
  const isStandardFinal = Boolean(selectedGroup && isStandardSingleAssessmentFinalGroup(selectedGroup, availableGroups))
  const maximumWeight = isStandardFinal ? 100 : getMaximumAssessmentWeight(groupAssessments, initial?.id)
  const groupAlreadyComplete = !initial && (maximumWeight <= 0 || (isStandardFinal && groupAssessments.length > 0))

  useEffect(() => {
    if (open) {
      setSubjectId(initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "")
      setTitle(initial?.title ?? "")
      setScore(initial?.score?.toString() ?? "")
      setDate(initial?.date ?? todayIso())
      setNotes(initial?.notes ?? "")
      const nextSubjectId = initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? ""
      const subjectGroups = groups.filter((group) => group.subjectId === nextSubjectId && isActiveAssessmentGroup(group))
      const nextGroupId = initial?.groupId ?? defaultGroupId ?? (subjectGroups.length === 1 ? subjectGroups[0].id : "")
      const nextGroup = subjectGroups.find((group) => group.id === nextGroupId)
      const nextAssessments = assessments.filter((assessment) => assessment.groupId === nextGroupId)
      const suggestedWeight = nextGroup && isStandardSingleAssessmentFinalGroup(nextGroup, subjectGroups)
        ? 100
        : getMaximumAssessmentWeight(nextAssessments, initial?.id)
      setGroupId(nextGroupId)
      setWeight(initial?.weightWithinGroup?.toString() ?? initial?.weight?.toString() ?? (suggestedWeight > 0 ? suggestedWeight.toString() : ""))
    }
  }, [open, initial, defaultSubjectId, defaultGroupId, subjects, groups, assessments])

  const scoreNum = parseFloat(score)
  const weightNum = parseFloat(weight)

  const errors = useMemo(() => {
    const errs: string[] = []
    if (!subjectId) errs.push(t("common.required"))
    if (!groupId) errs.push("Selecciona un grupo de evaluación.")
    if (!title.trim()) errs.push(t("common.required"))
    if (!isScoreInScale(scoreNum, scale))
      errs.push(t("grade.scale", { min: scale.min, max: scale.max, passing: scale.passing }))
    if (!isStandardFinal && !isValidWeight(weightNum)) errs.push(`${t("grade.weight")} (1-100)`)
    if (!isStandardFinal && weightNum > maximumWeight)
      errs.push(`Solo queda ${maximumWeight}% disponible en ${selectedGroup?.name ?? "este grupo"}.`)
    if (groupAlreadyComplete) errs.push("La ponderación de este grupo ya está completa.")
    return errs
  }, [subjectId, groupId, title, scoreNum, weightNum, scale, isStandardFinal, maximumWeight, selectedGroup, groupAlreadyComplete, t])

  const valid = errors.length === 0

  const submit = () => {
    if (!valid) return
    onSubmit({
      subjectId,
      groupId: groupId || undefined,
      title: title.trim(),
      score: scoreNum,
      weight: isStandardFinal ? 100 : weightNum,
      weightWithinGroup: isStandardFinal ? 100 : weightNum,
      status: "graded",
      date,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t("grade.edit") : t("grade.create")}</DialogTitle>
          <DialogDescription>
            {t("grade.scale", { min: scale.min, max: scale.max, passing: scale.passing })}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="g-subject">{t("grade.subject")}</FieldLabel>
            {lockSubject || initial ? (
              <div id="g-subject" className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                {selectedSubject?.name ?? "Materia no disponible"}
              </div>
            ) : <Select value={subjectId} onValueChange={(nextSubjectId) => {
              setSubjectId(nextSubjectId)
              const nextGroups = groups.filter((group) => group.subjectId === nextSubjectId && isActiveAssessmentGroup(group))
              const nextGroup = nextGroups.length === 1 ? nextGroups[0] : undefined
              setGroupId(nextGroup?.id ?? "")
              if (nextGroup) {
                const nextAssessments = assessments.filter((assessment) => assessment.groupId === nextGroup.id)
                setWeight(isStandardSingleAssessmentFinalGroup(nextGroup, nextGroups)
                  ? "100"
                  : getMaximumAssessmentWeight(nextAssessments).toString())
              }
            }}>
              <SelectTrigger id="g-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>}
          </Field>

          <div>
            <Field>
              <FieldLabel htmlFor="g-group">Grupo de evaluación</FieldLabel>
              <Select value={groupId} onValueChange={(nextGroupId) => {
                setGroupId(nextGroupId)
                const nextGroup = availableGroups.find((group) => group.id === nextGroupId)
                const nextAssessments = assessments.filter((assessment) => assessment.groupId === nextGroupId)
                setWeight(nextGroup && isStandardSingleAssessmentFinalGroup(nextGroup, availableGroups)
                  ? "100"
                  : getMaximumAssessmentWeight(nextAssessments, initial?.id).toString())
              }}>
                <SelectTrigger id="g-group"><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {availableGroups.length === 0 && <FieldDescription>Esta materia todavía no tiene grupos configurados.</FieldDescription>}
            </Field>
          </div>

          {!hasTransversalGroup && subjectId && onApplyTwoGroupPreset && (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <p className="text-muted-foreground">No existe un grupo transversal para esta materia.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
                const confirmed = window.confirm("Se configurarán grupos Parciales 60% y Transversal 40%. Las evaluaciones existentes se conservarán en su grupo actual.")
                if (confirmed) onApplyTwoGroupPreset(subjectId)
              }}>
                Configurar Parciales + Transversal
              </Button>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="g-title">{t("grade.title")}</FieldLabel>
            <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="g-score">{t("grade.score")}</FieldLabel>
              <Input
                id="g-score"
                type="number"
                step="0.1"
                min={scale.min}
                max={scale.max}
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
              <FieldDescription>
                {scale.min}–{scale.max}
              </FieldDescription>
            </Field>
            {isStandardFinal ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                Esta evaluación representa el 100% del grupo transversal.
              </div>
            ) : <Field>
              <FieldLabel htmlFor="g-weight">Peso dentro del grupo (%)</FieldLabel>
              <Input
                id="g-weight"
                type="number"
                step="0.01"
                min={1}
                max={maximumWeight}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <FieldDescription>
                Disponible: {maximumWeight}% en {selectedGroup?.name ?? "el grupo seleccionado"}.
              </FieldDescription>
            </Field>}
          </div>

          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="g-date">{t("grade.date")}</FieldLabel>
            <Input
              id="g-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="g-notes">{t("grade.notes")}</FieldLabel>
            <Textarea
              id="g-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!valid}>
            {initial ? t("common.update") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
