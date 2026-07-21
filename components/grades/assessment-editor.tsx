import { Badge } from "@/components/ui/badge"
import type { AssessmentGroup, Grade } from "@/lib/types"
import { getAssessmentEffectiveWeight } from "@/domain/grading"
export function AssessmentEditor({ group, assessment }: { group: AssessmentGroup; assessment: Grade }) {
  const internal = assessment.weightWithinGroup ?? assessment.weight
  return <div className="rounded-md border p-2 text-sm"><div className="font-medium">{assessment.title}</div><div className="text-xs text-muted-foreground">Fecha: {assessment.date} · Estado: {assessment.status ?? "graded"}</div><div className="mt-1 flex flex-wrap gap-2"><Badge variant="secondary">Peso dentro del grupo: {internal}%</Badge><Badge variant="secondary">Peso final del grupo: {group.courseWeight}%</Badge><Badge>Peso efectivo de la evaluación: {getAssessmentEffectiveWeight(group, assessment)}%</Badge></div></div>
}
