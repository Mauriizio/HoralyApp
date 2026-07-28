import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AssessmentGroup, Grade } from "@/lib/types"
import { getAssessmentEffectiveWeight } from "@/domain/grading"

const STATUS_LABELS = {
  planned: "Planificada",
  graded: "Calificada",
  missing: "Pendiente",
  exempt: "Eximida",
} as const

export function AssessmentEditor({
  group,
  assessment,
  onEdit,
  onDelete,
}: {
  group: AssessmentGroup
  assessment: Grade
  onEdit?: () => void
  onDelete?: () => void
}) {
  const internal = assessment.weightWithinGroup ?? assessment.weight
  const status = assessment.status ?? "graded"
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{assessment.title}</div>
          <div className="text-xs text-muted-foreground">Fecha: {assessment.date} · Estado: {STATUS_LABELS[status]}</div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Eliminar</Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge variant="secondary">Peso dentro del grupo: {internal}%</Badge>
        <Badge variant="secondary">Peso final del grupo: {group.courseWeight}%</Badge>
        <Badge>Peso efectivo final: {getAssessmentEffectiveWeight(group, assessment)}%</Badge>
      </div>
    </div>
  )
}
