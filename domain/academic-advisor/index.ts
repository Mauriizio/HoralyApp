import { evaluateSubjectGradingPlan, type SubjectGradingPlan } from "../grading/index"
import type { AcademicAgendaItem } from "../academic-agenda/index"

export interface AcademicRecommendation { id: string; priority: 1 | 2 | 3 | 4 | 5; title: string; message: string; explanation: string; evidence: string[]; subjectId?: string; suggestedAction: string; validUntil: string }
export interface AdvisorInput { now: Date; plan: SubjectGradingPlan; subjects: { id: string; name: string }[]; agendaItems: AcademicAgendaItem[]; weeklyLoad: { classBlocks: number; studyBlocks: number } }
export function hasExternalAiDependency(): boolean { return false }

export function generateAcademicRecommendations(input: AdvisorInput): AcademicRecommendation[] {
  const projection = evaluateSubjectGradingPlan(input.plan)
  const subjectName = input.subjects.find((s) => s.id === input.plan.subjectId)?.name ?? "la asignatura"
  const validUntil = new Date(input.now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const recs: AcademicRecommendation[] = []
  const upcoming = input.agendaItems.find((item) => item.kind === "assessment" && item.subjectId === input.plan.subjectId)
  if (upcoming) recs.push({ id: `upcoming-${input.plan.subjectId}-${upcoming.id}`, priority: 4, title: "Evaluación próxima de alto impacto", message: `Tu próxima evaluación de ${subjectName} puede cambiar la proyección del ramo.`, explanation: "Se detectó una evaluación planificada en la agenda activa del semestre.", evidence: [upcoming.title, upcoming.startsAt.toISOString()], subjectId: input.plan.subjectId, suggestedAction: "Abrir evaluación", validUntil })
  if (projection.requiredFinalExamScore?.requiredScore !== null && projection.requiredFinalExamScore) recs.push({ id: `transversal-${input.plan.subjectId}`, priority: projection.requiredFinalExamScore.status === "impossible_high" ? 5 : 3, title: "Transversal necesario", message: `Con tu presentación actual necesitarías aproximadamente ${projection.requiredFinalExamScore.requiredScore} en el transversal para aprobar.`, explanation: "Cálculo determinista: objetivo menos contribución actual, dividido por peso pendiente.", evidence: [`presentación=${projection.presentationAverage ?? "sin datos"}`, `peso final pendiente=${input.plan.groups.find((g) => g.kind === "final_exam")?.courseWeight ?? 0}`], subjectId: input.plan.subjectId, suggestedAction: "Simular escenario", validUntil })
  if (!projection.validity.isValid || projection.validity.warnings.length > 0) recs.push({ id: `weights-${input.plan.subjectId}`, priority: 5, title: "Pesos por revisar", message: "Esta proyección depende de que los pesos registrados sean correctos.", explanation: "Hay pesos incompletos o inválidos en grupos/evaluaciones.", evidence: [...projection.validity.errors, ...projection.validity.warnings], subjectId: input.plan.subjectId, suggestedAction: "Abrir configurador", validUntil })
  if (input.weeklyLoad.studyBlocks === 0) recs.push({ id: `study-plan-${input.plan.subjectId}`, priority: 2, title: "Planificación de estudio pendiente", message: `${subjectName} no tiene bloques de estudio registrados esta semana.`, explanation: "La agenda no muestra estudio planificado para reducir riesgo antes de evaluaciones.", evidence: [`studyBlocks=${input.weeklyLoad.studyBlocks}`], subjectId: input.plan.subjectId, suggestedAction: "Crear bloque de estudio", validUntil })
  if (input.weeklyLoad.classBlocks + input.weeklyLoad.studyBlocks >= 24) recs.push({ id: `weekly-load-${input.plan.semesterId}`, priority: 3, title: "Carga semanal alta", message: "Tu carga semanal es alta; prioriza evaluaciones con mayor peso efectivo.", explanation: "Se sumaron módulos de clase y bloques de estudio del semestre activo.", evidence: [`total=${input.weeklyLoad.classBlocks + input.weeklyLoad.studyBlocks}`], suggestedAction: "Ver agenda", validUntil })
  const offset = Math.floor(input.now.getTime() / 86_400_000)
  return recs.sort((a, b) => b.priority - a.priority || stableRotate(a.id, offset).localeCompare(stableRotate(b.id, offset)))
}
function stableRotate(id: string, offset: number): string { return `${(hash(id) + offset) % 997}-${id}` }
function hash(value: string): number { return [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 997, 0) }
