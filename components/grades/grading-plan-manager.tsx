"use client"

import { Button } from "@/components/ui/button"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { Grade, Subject } from "@/lib/types"
import { evaluateSubjectGradingPlan } from "@/domain/grading"
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
  const groups = store.data.assessmentGroups.filter((group) => group.subjectId === subject.id).sort((a, b) => a.position - b.position)
  const assessments = store.data.grades.filter((grade) => grade.subjectId === subject.id)
  const projection = evaluateSubjectGradingPlan({
    semesterId: subject.semesterId ?? store.data.activeSemesterId ?? "",
    subjectId: subject.id,
    groups,
    assessments: assessments.map((grade) => ({
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => store.applyGradingPreset(subject.id, "continuous100")}>Continua 100%</Button>
        <Button size="sm" variant="outline" onClick={() => store.applyGradingPreset(subject.id, "presentation60Transversal40")}>Presentación 60% + transversal 40%</Button>
        <Button size="sm" variant="outline" onClick={() => store.applyGradingPreset(subject.id, "laboratoryTheoryTransversal")}>Laboratorio + teoría + transversal</Button>
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
      <GradeProjectionCard projection={projection} />
      <GradeSimulator assessments={assessments} onSimulate={store.simulateAssessmentScore} />
    </div>
  )
}
