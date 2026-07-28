import { Button } from "@/components/ui/button"
import type { AssessmentGroup, Grade } from "@/lib/types"
import { getAssessmentEffectiveWeight } from "@/domain/grading"

const STATUS_LABELS = {
  planned: "Planificada",
  graded: "Calificada",
  missing: "Pendiente",
  exempt: "Eximida",
} as const

const formatWeight = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value)

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
  const score = status === "graded" && assessment.score !== null ? assessment.score.toFixed(1) : "Sin nota"
  const formattedDate = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${assessment.date}T00:00:00Z`))
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{assessment.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formattedDate} · {STATUS_LABELS[status]}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums" aria-label={`Nota: ${score}`}>{score}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Peso dentro del grupo: <strong className="text-foreground">{formatWeight(internal)}%</strong></span>
        <span>Aporte a la nota final: <strong className="text-foreground">{formatWeight(getAssessmentEffectiveWeight(group, assessment))}%</strong></span>
      </div>
      <div className="mt-3 flex gap-1">
          <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Eliminar</Button>
      </div>
    </div>
  )
}
