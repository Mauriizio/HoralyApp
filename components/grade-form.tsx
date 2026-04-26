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
import type { Grade, GradeScale, Subject } from "@/lib/types"
import { isScoreInScale, isValidWeight } from "@/lib/grade-utils"

interface GradeFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  subjects: Subject[]
  scale: GradeScale
  initial?: Grade
  defaultSubjectId?: string
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
  scale,
  initial,
  defaultSubjectId,
  onSubmit,
}: GradeFormProps) {
  const { t } = useI18n()
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [score, setScore] = useState<string>(initial?.score?.toString() ?? "")
  const [weight, setWeight] = useState<string>(initial?.weight?.toString() ?? "20")
  const [date, setDate] = useState(initial?.date ?? todayIso())
  const [notes, setNotes] = useState(initial?.notes ?? "")

  useEffect(() => {
    if (open) {
      setSubjectId(initial?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "")
      setTitle(initial?.title ?? "")
      setScore(initial?.score?.toString() ?? "")
      setWeight(initial?.weight?.toString() ?? "20")
      setDate(initial?.date ?? todayIso())
      setNotes(initial?.notes ?? "")
    }
  }, [open, initial, defaultSubjectId, subjects])

  const scoreNum = parseFloat(score)
  const weightNum = parseFloat(weight)

  const errors = useMemo(() => {
    const errs: string[] = []
    if (!subjectId) errs.push(t("common.required"))
    if (!title.trim()) errs.push(t("common.required"))
    if (!isScoreInScale(scoreNum, scale))
      errs.push(t("grade.scale", { min: scale.min, max: scale.max, passing: scale.passing }))
    if (!isValidWeight(weightNum)) errs.push(`${t("grade.weight")} (1-100)`)
    return errs
  }, [subjectId, title, scoreNum, weightNum, scale, t])

  const valid = errors.length === 0

  const submit = () => {
    if (!valid) return
    onSubmit({
      subjectId,
      title: title.trim(),
      score: scoreNum,
      weight: weightNum,
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
            <Select value={subjectId} onValueChange={setSubjectId}>
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
            </Select>
          </Field>

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
            <Field>
              <FieldLabel htmlFor="g-weight">{t("grade.weight")}</FieldLabel>
              <Input
                id="g-weight"
                type="number"
                step="1"
                min={1}
                max={100}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
          </div>

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
