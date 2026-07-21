import type { AssessmentGroup, Grade } from "@/lib/types"
import { AssessmentEditor } from "./assessment-editor"
export function AssessmentGroupEditor({ group, assessments }: { group: AssessmentGroup; assessments: Grade[] }) {
  const total = assessments.filter((item) => item.status !== "exempt").reduce((sum, item) => sum + (item.weightWithinGroup ?? item.weight), 0)
  return <section className="rounded-lg border p-3 space-y-2"><div className="flex items-center justify-between gap-2"><h4 className="font-semibold">{group.name}</h4><span className="text-sm text-muted-foreground">Peso final del grupo: {group.courseWeight}%</span></div>{Math.abs(total - 100) > 0.001 && <p className="text-sm text-amber-600">Advertencia: los pesos dentro de {group.name} suman {total}%, deberían sumar 100%.</p>}<div className="space-y-2">{assessments.map((assessment) => <AssessmentEditor key={assessment.id} group={group} assessment={assessment} />)}</div></section>
}
