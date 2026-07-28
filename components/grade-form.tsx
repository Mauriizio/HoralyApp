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
import { getAvailableAssessmentGroups, getMaximumAssessmentWeight, isActiveAssessmentGroup, isStandardSingleAssessmentFinalGroup } from "@/lib/assessment-groups"

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
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty] = useState(false)
  const activeSubjectGroups = groups.filter((group) => group.subjectId === subjectId && isActiveAssessmentGroup(group))
  const availableGroups = getAvailableAssessmentGroups(groups, assessments, subjectId, initial?.id)
  const selectedSubject = subjects.find((subject) => subject.id === subjectId)
  const selectedGroup = availableGroups.find((group) => group.id === groupId)
  const groupAssessments = assessments.filter((assessment) => assessment.groupId === groupId)
  const isStandardFinal = Boolean(selectedGroup && isStandardSingleAssessmentFinalGroup(selectedGroup, activeSubjectGroups))
  const maximumWeight = isStandardFinal ? 100 : getMaximumAssessmentWeight(groupAssessments, initial?.id)
  const groupAlreadyComplete = !initial && (maximumWeight <= 0 || (isStandardFinal && groupAssessments.length > 0))

  useEffect(() => {
    if (open) {
      setSubjectId(initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "")
      setTitle(initial?.title ?? "")
      setScore(initial?.score?.toString() ?? "")
      setDate(initial?.date ?? todayIso())
      setNotes(initial?.notes ?? "")
      setSubmitted(false)
      setDirty(false)
      const nextSubjectId = initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? ""
      const subjectGroups = getAvailableAssessmentGroups(groups, assessments, nextSubjectId, initial?.id)
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
    const errs: { group?: string; title?: string; score?: string; weight?: string } = {}
    if (!groupId) errs.group = "Selecciona un grupo de evaluación."
    if (groupId && !title.trim()) errs.title = "Ingresa el nombre de la evaluación."
    if (groupId && !isScoreInScale(scoreNum, scale))
      errs.score = `Ingresa una nota entre ${scale.min.toFixed(1)} y ${scale.max.toFixed(1)}.`
    if (groupId && !isStandardFinal && (!isValidWeight(weightNum) || weightNum > maximumWeight))
      errs.weight = weightNum > maximumWeight
        ? `Solo queda ${maximumWeight}% disponible en este grupo.`
        : "Ingresa un peso válido."
    if (groupId && groupAlreadyComplete) errs.group = "La ponderación de este grupo ya está completa."
    return errs
  }, [subjectId, groupId, title, scoreNum, weightNum, scale, isStandardFinal, maximumWeight, selectedGroup, groupAlreadyComplete, t])

  const valid = Object.keys(errors).length === 0

  const submit = () => {
    setSubmitted(true)
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
    setDirty(false)
    onOpenChange(false)
  }

  const requestClose = (nextOpen: boolean) => {
    if (!nextOpen && dirty && !window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="grid max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md">
        <div className="px-6 pt-6">
        <DialogHeader>
          <DialogTitle>{initial ? t("grade.edit") : t("grade.create")}</DialogTitle>
          <DialogDescription>
            Escala {scale.min.toFixed(1)} a {scale.max.toFixed(1)} · aprobación {scale.passing.toFixed(1)}
          </DialogDescription>
        </DialogHeader>
        </div>
        <div className="overflow-y-auto px-6 pb-4">
        <FieldGroup onChange={() => setDirty(true)}>
          <Field>
            <FieldLabel htmlFor="g-subject">{t("grade.subject")}</FieldLabel>
            {lockSubject || initial ? (
              <div id="g-subject" className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                {selectedSubject?.name ?? "Materia no disponible"}
              </div>
            ) : <Select value={subjectId} onValueChange={(nextSubjectId) => {
              setSubjectId(nextSubjectId)
              const nextGroups = getAvailableAssessmentGroups(groups, assessments, nextSubjectId)
              const nextGroup = nextGroups.length === 1 ? nextGroups[0] : undefined
              setGroupId(nextGroup?.id ?? "")
              setWeight("")
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
              {!groupId && (
                <FieldDescription className={submitted ? "text-destructive" : undefined}>
                  {submitted ? errors.group : "Selecciona primero un grupo de evaluación"}
                </FieldDescription>
              )}
              {availableGroups.length === 0 && <FieldDescription>La estructura de evaluación está completa. Puedes editar o eliminar una evaluación existente.</FieldDescription>}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="g-title">{t("grade.title")}</FieldLabel>
            <Input id="g-title" disabled={!groupId} value={title} onChange={(e) => setTitle(e.target.value)} />
            {submitted && errors.title && <FieldDescription className="text-destructive">{errors.title}</FieldDescription>}
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
                disabled={!groupId}
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
              <FieldDescription>
                {submitted && errors.score ? <span className="text-destructive">{errors.score}</span> : `${scale.min.toFixed(1)}–${scale.max.toFixed(1)}`}
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
                disabled={!groupId}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <FieldDescription>
                {submitted && errors.weight
                  ? <span className="text-destructive">{errors.weight}</span>
                  : `Disponible: ${maximumWeight}% en ${selectedGroup?.name ?? "el grupo seleccionado"}.`}
              </FieldDescription>
            </Field>}
          </div>

          <Field>
            <FieldLabel htmlFor="g-date">{t("grade.date")}</FieldLabel>
            <Input
              id="g-date"
              type="date"
              disabled={!groupId}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="g-notes">{t("grade.notes")}</FieldLabel>
            <Textarea
              id="g-notes"
              rows={2}
              disabled={!groupId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </FieldGroup>
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={() => requestClose(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!groupId || availableGroups.length === 0}>
            {initial ? t("common.update") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
