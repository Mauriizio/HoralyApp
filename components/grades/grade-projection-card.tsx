import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SubjectProjection } from "@/domain/grading"

const CONFIDENCE_LABELS = { none: "Sin cobertura", low: "Cobertura baja", medium: "Cobertura media", high: "Cobertura alta", complete: "Cobertura completa" } as const
const STATUS_LABELS = {
  no_data: "Sin evaluaciones",
  incomplete_configuration: "Configuración incompleta",
  in_progress: "En progreso",
  requires_attention: "Requiere atención",
  at_risk: "En riesgo",
  mathematically_approved: "Aprobación asegurada matemáticamente",
  impossible_target: "Meta fuera de alcance",
  finished: "Finalizada",
} as const

export function GradeProjectionCard({ projection }: { projection: SubjectProjection }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados y proyecciones</CardTitle>
        <CardDescription>Los resultados reales, las proyecciones y las simulaciones se muestran por separado.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        <p>Promedio actual evaluado: {projection.evaluatedAverage ?? "Sin datos"}</p>
        <p>Aporte acumulado a la nota final: {projection.currentContribution}</p>
        <p>Datos disponibles: {CONFIDENCE_LABELS[projection.confidence]}</p>
        <p>Proyección orientativa: {projection.projectedFinalGrade ?? "Completa la estructura para proyectar"}</p>
        <p>Nota final real: {projection.definitiveFinalGrade ?? "Aún no disponible"}</p>
        <p>Nota necesaria en transversal: {projection.requiredFinalExamScore?.requiredScore ?? "No aplica"}</p>
        <p>Mínimo final posible: {projection.minimumPossibleFinalGrade}</p>
        <p>Máximo final posible: {projection.maximumPossibleFinalGrade}</p>
        <p>Estado académico: {STATUS_LABELS[projection.status]}</p>
      </CardContent>
    </Card>
  )
}
