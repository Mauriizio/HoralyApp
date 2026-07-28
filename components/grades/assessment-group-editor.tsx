import type { AssessmentGroup, Grade } from "@/lib/types"
import { AssessmentEditor } from "./assessment-editor"

export function AssessmentGroupEditor({
  group,
  assessments,
  onEditAssessment,
  onDeleteAssessment,
  inactive = false,
}: {
  group: AssessmentGroup
  assessments: Grade[]
  onEditAssessment?: (assessment: Grade) => void
  onDeleteAssessment?: (assessment: Grade) => void
  inactive?: boolean
}) {
  const total = assessments.filter((item) => item.status !== "exempt").reduce((sum, item) => sum + (item.weightWithinGroup ?? item.weight), 0)
  const delta = Math.round(Math.abs(100 - total) * 100) / 100
  const message = total < 100
    ? `Configuración incompleta: falta distribuir ${delta}%`
    : total > 100
      ? `Exceso de peso: sobran ${delta}%`
      : "Configuración completa: 100%"
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{group.name}</h4>
        <span className="text-sm text-muted-foreground">Peso final del grupo: {group.courseWeight}%</span>
      </div>
      {!inactive && <p className={`text-sm ${total > 100 ? "text-destructive" : total < 100 ? "text-amber-600" : "text-emerald-600"}`}>{message}</p>}
      <div className="space-y-2">
        {assessments.map((assessment) => (
          <AssessmentEditor
            key={assessment.id}
            group={group}
            assessment={assessment}
            onEdit={() => onEditAssessment?.(assessment)}
            onDelete={() => onDeleteAssessment?.(assessment)}
          />
        ))}
      </div>
    </section>
  )
}
