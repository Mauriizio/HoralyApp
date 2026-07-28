"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { Grade, Subject } from "@/lib/types"
import { evaluateSubjectGradingPlan } from "@/domain/grading"
import { isActiveAssessmentGroup, type GradingPresetId } from "@/lib/assessment-groups"
import { AssessmentGroupEditor } from "./assessment-group-editor"
import { GradeProjectionCard } from "./grade-projection-card"
import { GradeSimulator } from "./grade-simulator"

export function GradingPlanManager({
  store,
  subject,
  onEditAssessment,
}: {
  store: ScheduleStore
  subject: Subject
  onEditAssessment?: (assessment: Grade) => void
}) {
  const [pendingPreset, setPendingPreset] = useState<{ id: GradingPresetId; groupNames: string[] } | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const allGroups = store.data.assessmentGroups.filter((group) => group.subjectId === subject.id).sort((a, b) => a.position - b.position)
  const groups = allGroups.filter(isActiveAssessmentGroup)
  const inactiveGroups = allGroups.filter((group) => !isActiveAssessmentGroup(group))
  const assessments = store.data.grades.filter((grade) => grade.subjectId === subject.id)
  const activeGroupIds = new Set(groups.map((group) => group.id))
  const activeAssessments = assessments.filter((assessment) => assessment.groupId && activeGroupIds.has(assessment.groupId))
  const projection = evaluateSubjectGradingPlan({
    semesterId: subject.semesterId ?? store.data.activeSemesterId ?? "",
    subjectId: subject.id,
    groups,
    assessments: activeAssessments.map((grade) => ({
      ...grade,
      groupId: grade.groupId ?? groups[0]?.id ?? "",
      weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
      scheduledDate: grade.date,
      status: grade.status ?? (grade.score === null ? "planned" : "graded"),
    })),
    scale: store.data.settings.gradeScale,
    targetGrade: store.data.settings.gradeScale.passing,
  })

  const removeAssessment = (assessment: Grade) => {
    if (window.confirm(`Eliminar "${assessment.title}"? Las demás evaluaciones se conservarán.`)) {
      store.deleteAssessment(assessment.id)
    }
  }
  const usePreset = (preset: GradingPresetId) => {
    const result = store.applyGradingPreset(subject.id, preset)
    if (result.requiresResolution) {
      setPendingPreset({ id: preset, groupNames: result.obsoletePopulatedGroups.map((group) => group.name) })
    }
  }
  const selectedPreset = groups.length === 1 && groups[0].kind === "continuous" && groups[0].courseWeight === 100
    ? "continuous100"
    : groups.length === 2 && groups.some((group) => group.kind === "continuous" && group.courseWeight === 60)
      && groups.some((group) => group.kind === "final_exam" && group.courseWeight === 40)
      ? "presentation60Transversal40"
      : groups.length === 3 && groups.some((group) => group.kind === "laboratory" && group.courseWeight === 30)
        && groups.some((group) => group.kind === "continuous" && group.courseWeight === 30)
        && groups.some((group) => group.kind === "final_exam" && group.courseWeight === 40)
        ? "laboratoryTheoryTransversal"
        : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={selectedPreset === "continuous100" ? "default" : "outline"} onClick={() => usePreset("continuous100")}>Usar continua 100%</Button>
        <Button size="sm" variant={selectedPreset === "presentation60Transversal40" ? "default" : "outline"} onClick={() => usePreset("presentation60Transversal40")}>Usar parciales 60% + transversal 40%</Button>
        <Button size="sm" variant={selectedPreset === "laboratoryTheoryTransversal" ? "default" : "outline"} onClick={() => usePreset("laboratoryTheoryTransversal")}>Usar laboratorio + teoría + transversal</Button>
        <Button size="sm" variant="outline" onClick={() => store.createAssessmentGroup({ semesterId: subject.semesterId ?? store.data.activeSemesterId ?? "", subjectId: subject.id, name: "Grupo personalizado", kind: "custom", courseWeight: 0, position: groups.length + 1 })}>Crear grupo personalizado</Button>
      </div>
      {groups.map((group) => (
        <AssessmentGroupEditor
          key={group.id}
          group={group}
          assessments={assessments.filter((assessment) => assessment.groupId === group.id)}
          onEditAssessment={onEditAssessment}
          onDeleteAssessment={removeAssessment}
        />
      ))}
      {inactiveGroups.length > 0 && (
        <section className="space-y-2 rounded-lg border border-dashed p-3">
          <h4 className="font-semibold">Grupos fuera de la estructura activa</h4>
          <p className="text-sm text-muted-foreground">Se conservan para que puedas reasignar sus evaluaciones. No participan en cálculos ni al registrar notas nuevas.</p>
          {inactiveGroups.map((group) => (
            <AssessmentGroupEditor
              key={group.id}
              group={group}
              assessments={assessments.filter((assessment) => assessment.groupId === group.id)}
              onEditAssessment={onEditAssessment}
              onDeleteAssessment={removeAssessment}
              inactive
            />
          ))}
        </section>
      )}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="rounded-lg border bg-muted/20">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between" aria-expanded={detailsOpen}>
            Detalles y estadísticas
            <ChevronDown className={`size-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 border-t p-3">
          <GradeProjectionCard projection={projection} />
          {projection.definitiveFinalGrade === null && (
            <GradeSimulator
              subject={subject}
              groups={groups}
              assessments={activeAssessments}
              scale={store.data.settings.gradeScale}
              onSimulate={store.simulateAssessmentScore}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
      <Dialog open={Boolean(pendingPreset)} onOpenChange={(open) => { if (!open) setPendingPreset(null) }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Este cambio afecta grupos con evaluaciones</DialogTitle>
            <DialogDescription>
              Los grupos {pendingPreset?.groupNames.join(", ")} contienen evaluaciones y no se eliminarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Puedes conservar la estructura actual o aplicar el preset dejando esos grupos temporalmente fuera de la estructura activa para reasignar sus evaluaciones manualmente.
          </div>
          <DialogFooter className="flex-wrap">
            <Button variant="ghost" onClick={() => setPendingPreset(null)}>Cancelar</Button>
            <Button variant="outline" onClick={() => setPendingPreset(null)}>Conservar estructura actual</Button>
            <Button variant="outline" onClick={() => {
              if (!pendingPreset) return
              store.applyGradingPreset(subject.id, pendingPreset.id, { preservePopulatedObsoleteGroups: true })
              setPendingPreset(null)
            }}>Aplicar y reasignar manualmente</Button>
            <Button onClick={() => {
              if (!pendingPreset) return
              store.applyGradingPreset(subject.id, pendingPreset.id, { preservePopulatedObsoleteGroups: true })
              setPendingPreset(null)
            }}>Conservar temporalmente fuera de estructura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
