"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { evaluateSubjectGradingPlan } from "@/domain/grading"
import { isScoreInScale } from "@/lib/grade-utils"
import type { AssessmentGroup, Grade, GradeScale, Subject } from "@/lib/types"

export function GradeSimulator({
  subject,
  groups,
  assessments,
  scale,
  onSimulate,
}: {
  subject: Subject
  groups: AssessmentGroup[]
  assessments: Grade[]
  scale: GradeScale
  onSimulate: (gradeId: string, score: number) => Grade[]
}) {
  const pending = useMemo(
    () => assessments.filter((grade) => (grade.status ?? (grade.score === null ? "planned" : "graded")) !== "graded" || grade.score === null),
    [assessments],
  )
  const [selectedId, setSelectedId] = useState(pending[0]?.id ?? "")
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!pending.some((grade) => grade.id === selectedId)) setSelectedId(pending[0]?.id ?? "")
  }, [pending, selectedId])

  const selected = pending.find((grade) => grade.id === selectedId) ?? pending[0]
  const score = Number(value)
  const simulatedProjection = useMemo(() => {
    if (!selected || !isScoreInScale(score, scale)) return null
    const simulated = onSimulate(selected.id, score)
    const groupIds = new Set(groups.map((group) => group.id))
    return evaluateSubjectGradingPlan({
      semesterId: subject.semesterId ?? "",
      subjectId: subject.id,
      groups,
      assessments: simulated.filter((grade) => grade.groupId && groupIds.has(grade.groupId)).map((grade) => ({
        ...grade,
        groupId: grade.groupId ?? "",
        weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
        scheduledDate: grade.date,
        status: grade.status ?? (grade.score === null ? "planned" : "graded"),
      })),
      scale,
      targetGrade: scale.passing,
    })
  }, [selected, score, scale, onSimulate, groups, subject])

  if (pending.length === 0) return null

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div>
        <Label htmlFor="grade-simulation">Simular nota de {selected?.title}</Label>
        <p className="text-xs text-muted-foreground">Este escenario estima el impacto de una evaluación pendiente y no modifica ni guarda la nota real.</p>
      </div>
      {pending.length > 1 && (
        <Select value={selected?.id} onValueChange={(id) => { setSelectedId(id); setValue("") }}>
          <SelectTrigger aria-label="Evaluación pendiente a simular"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pending.map((grade) => <SelectItem key={grade.id} value={grade.id}>{grade.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Input
        id="grade-simulation"
        type="number"
        min={scale.min}
        max={scale.max}
        step="0.1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Nota entre ${scale.min} y ${scale.max}`}
        inputMode="decimal"
      />
      {value && !isScoreInScale(score, scale) && <p role="alert" className="text-xs text-destructive">Ingresa una nota válida entre {scale.min} y {scale.max}.</p>}
      {simulatedProjection && (
        <div className="rounded-md bg-muted/50 p-2 text-sm">
          <p>Proyección del escenario: <strong>{simulatedProjection.projectedFinalGrade ?? "Configuración incompleta"}</strong></p>
          <p className="text-xs text-muted-foreground">Aporte acumulado estimado: {simulatedProjection.currentContribution}. Simulación no guardada.</p>
        </div>
      )}
    </section>
  )
}
