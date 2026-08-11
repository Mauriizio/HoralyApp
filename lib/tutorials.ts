import type { AppData } from "@/lib/types"
import type { AppTab } from "@/components/app-shell/navigation"

export type TutorialId = "basic-tour" | "schedule-tour" | "grades-tour" | "reminders-tour" | "tools-tour" | "preferences-tour" | "assistant-tour" | "analytics-tour" | "notebook-tour" | "advanced-mode-tour"
export type TutorialStatus = "not-started" | "in-progress" | "completed" | "skipped"
export type TutorialStepType = "information" | "action"
export type TutorialPlacement = "top" | "right" | "bottom" | "left" | "center"

export interface TutorialStep {
  id: string
  title: string
  description: string
  type: TutorialStepType
  target?: string
  tab?: string
  preferredPlacement?: TutorialPlacement
  fallbackPlacement?: TutorialPlacement
  requiredEvent?: string
  actionLabel?: string
  completionStrategy?: "manual" | "event"
  allowTargetInteraction?: boolean
}

export interface TutorialDefinition {
  id: TutorialId
  version: number
  title: string
  entryTab: AppTab
  steps: readonly TutorialStep[]
}

export interface TutorialProgress {
  version: number
  status: TutorialStatus
  currentStep: number
  updatedAt?: string
}

const info = (step: Omit<TutorialStep, "type">): TutorialStep => ({ ...step, type: "information" })
const action = (step: Omit<TutorialStep, "type" | "completionStrategy" | "allowTargetInteraction">): TutorialStep => ({
  ...step, type: "action", completionStrategy: "event", allowTargetInteraction: true,
})
const tutorial = (id: TutorialId, title: string, entryTab: AppTab, steps: readonly TutorialStep[]): TutorialDefinition => ({ id, version: 2, title, entryTab, steps })

export const TUTORIAL_REGISTRY: Record<TutorialId, TutorialDefinition> = {
  "basic-tour": tutorial("basic-tour", "Recorrido básico", "dashboard", [
    info({ id: "dashboard", title: "Dashboard", description: "Aquí ves lo que ocurre hoy, tu próxima clase, pendientes y el resumen académico.", tab: "dashboard", target: "dashboard-overview" }),
    info({ id: "subjects", title: "Materias", description: "Agrega materias y edita su color, icono y datos sin perder tu organización.", tab: "materias", target: "add-subject" }),
    info({ id: "schedule", title: "Horario", description: "Los módulos definen horas; los bloques asignan una materia a uno o más módulos.", tab: "horario", target: "schedule-grid" }),
    info({ id: "grades", title: "Notas", description: "Elige una estructura, registra evaluaciones y edítalas desde cada materia.", tab: "notas", target: "grades-overview" }),
    info({ id: "reminders", title: "Recordatorios", description: "Crea un recordatorio con fecha y revisa aquí sus próximos vencimientos.", tab: "recordatorios", target: "reminders-overview" }),
    info({ id: "preferences", title: "Personalización y ayuda", description: "En Preferencias ajustas tema, escala, módulos y puedes reiniciar cualquier tutorial.", tab: "preferencias", target: "learning-settings" }),
  ]),
  "schedule-tour": tutorial("schedule-tour", "Cómo usar Horario", "horario", [
    info({ id: "modules", title: "Módulos horarios", description: "Cada módulo representa un tramo de tiempo. Sus horas se cambian en Preferencias.", target: "schedule-modules-summary" }),
    action({ id: "block", title: "Crea un bloque", description: "Haz clic en una celda vacía para abrir el selector de materias.", target: "schedule-empty-cell", requiredEvent: "schedule-cell-opened", actionLabel: "Haz clic en una celda vacía" }),
    action({ id: "subject", title: "Elige una materia", description: "Haz clic en una materia real para asignarla a este bloque.", target: "schedule-subject-picker", requiredEvent: "schedule-subject-selected", actionLabel: "Haz clic en una materia" }),
    info({ id: "edit", title: "Edita tus bloques", description: "Desde un bloque existente puedes editarlo, moverlo o eliminarlo.", target: "schedule-existing-block" }),
  ]),
  "grades-tour": tutorial("grades-tour", "Cómo configurar Notas", "notas", [
    action({ id: "structure", title: "Configura la estructura", description: "Abre la configuración para elegir evaluación continua o parciales y transversal.", target: "grades-configure", requiredEvent: "grades-dialog-opened", actionLabel: "Haz clic en Configurar" }),
    info({ id: "assessment", title: "Registra evaluaciones", description: "Cada evaluación pertenece a un grupo y tiene una ponderación interna; luego puedes editarla o eliminarla.", target: "grades-add-assessment" }),
    info({ id: "average", title: "Interpreta tu promedio", description: "El promedio mostrado usa únicamente tus evaluaciones y la estructura configurada.", target: "grades-average-summary" }),
  ]),
  "reminders-tour": tutorial("reminders-tour", "Cómo usar Recordatorios", "recordatorios", [
    action({ id: "create", title: "Crea un recordatorio", description: "Abre el formulario para escribir título, fecha, hora y prioridad.", target: "reminder-create", requiredEvent: "reminder-dialog-opened", actionLabel: "Haz clic en Crear recordatorio" }),
    info({ id: "appear", title: "Dónde aparecen", description: "Al guardar, los vencimientos aparecen aquí y alimentan tu resumen del Dashboard.", target: "reminders-list" }),
  ]),
  "tools-tour": tutorial("tools-tour", "Herramientas académicas", "herramientas", [
    info({ id: "catalog", title: "Catálogo", description: "Busca herramientas disponibles por nombre o categoría.", target: "tools-catalog" }),
    info({ id: "resistor", title: "Código de resistencias", description: "Abre la herramienta de código de colores para calcular valores por bandas.", target: "tools-catalog" }),
    info({ id: "calculator", title: "Calculadora científica", description: "Usa la calculadora segura con trigonometría, logaritmos, constantes, DEG/RAD e historial.", target: "tools-catalog" }),
  ]),
  "notebook-tour": tutorial("notebook-tour", "Cuaderno de estudio", "cuaderno", [
    info({ id: "subject", title: "Elige una materia", description: "Cada materia conserva su propio conjunto de apuntes.", target: "notebook-subjects" }),
    info({ id: "new", title: "Crea un apunte", description: "Abre una materia y usa Nueva nota para comenzar.", target: "notebook-subjects" }),
    info({ id: "content", title: "Añade título y contenido", description: "Puedes pegar texto largo y organizarlo por unidad o tema.", target: "notebook-subjects" }),
    info({ id: "save", title: "Guardado controlado", description: "El editor guarda tras una pausa y siempre muestra su estado.", target: "notebook-subjects" }),
    info({ id: "search", title: "Encuentra tus apuntes", description: "Busca por título, unidad o contenido y ordena por edición.", target: "notebook-subjects" }),
  ]),
  "preferences-tour": tutorial("preferences-tour", "Preferencias", "preferencias", [
    info({ id: "appearance", title: "Apariencia", description: "Ajusta tema, idioma, tipografía y escala de interfaz.", target: "preferences-appearance" }),
    info({ id: "academic", title: "Configuración académica", description: "Configura escala de notas y módulos horarios.", target: "preferences-grade-scale" }),
    info({ id: "learning", title: "Ayuda y tutoriales", description: "Desde aquí puedes restaurar Primeros pasos y reiniciar cualquier tutorial.", target: "learning-settings" }),
  ]),
  "assistant-tour": tutorial("assistant-tour", "Cómo usar Horarily", "dashboard", [
    info({ id: "actions", title: "Elige una acción", description: "Comienza con una acción concreta para materias, notas, horario, recordatorios o consultas.", target: "assistant-actions" }),
    info({ id: "selection", title: "Selecciona opciones", description: "Horarily te muestra materias y opciones reales cuando debe elegir.", target: "assistant-actions" }),
    info({ id: "context-input", title: "Escribe solo cuando se solicite", description: "El campo aparece únicamente para datos concretos, como el nombre de una materia.", target: "assistant-actions" }),
    info({ id: "confirm", title: "Revisa y confirma", description: "Antes de guardar puedes crear, personalizar, corregir o cancelar.", target: "assistant-actions" }),
    info({ id: "advanced", title: "Comandos avanzados opcionales", description: "La consola permanece disponible para usuarios que prefieren comandos explícitos.", target: "assistant-advanced-commands" }),
  ]),
  "analytics-tour": tutorial("analytics-tour", "Analítica académica", "analitica", [
    info({ id: "real-data", title: "Tus tendencias", description: "Esta vista resume información real de tus evaluaciones y materias; no usa datos de ejemplo.", target: "analytics-overview" }),
  ]),
  "advanced-mode-tour": tutorial("advanced-mode-tour", "Modo avanzado de Horarily", "dashboard", [
    info({ id: "console", title: "Consola avanzada", description: "La consola permite operar Horarily mediante acciones y comandos explícitos.", target: "assistant-actions" }),
    info({ id: "commands", title: "Comandos", description: "Abre Comandos avanzados y usa /AYUDA para consultar las operaciones disponibles.", target: "assistant-advanced-commands" }),
    info({ id: "normal", title: "Regresa al modo normal", description: "Puedes volver al flujo guiado desde la propia consola cuando quieras.", target: "assistant-advanced-commands" }),
    info({ id: "disable", title: "Desactivarlo", description: "En Preferencias puedes apagar Modo avanzado de Horarily sin perder tus datos.", tab: "preferencias", target: "advanced-mode-settings" }),
  ]),
}

export function buildTutorialStorageKey(identity: string) {
  return `horarily:tutorials:v2:${encodeURIComponent(identity)}`
}

export function normalizeTutorialProgress(definition: TutorialDefinition, progress?: Partial<TutorialProgress>): TutorialProgress {
  if (!progress) return { version: definition.version, status: "not-started", currentStep: 0 }
  if (progress.version !== definition.version && (progress.status === "completed" || progress.status === "skipped")) {
    return { version: definition.version, status: progress.status, currentStep: 0, updatedAt: progress.updatedAt }
  }
  return {
    version: definition.version,
    status: progress.status ?? "not-started",
    currentStep: Math.min(Math.max(progress.currentStep ?? 0, 0), definition.steps.length - 1),
    updatedAt: progress.updatedAt,
  }
}

export function getFirstStepsCompletion(data: AppData) {
  const settings = data.settings
  return {
    subject: data.subjects.length > 0,
    schedule: data.blocks.length > 0,
    grades: data.assessmentGroups.length > 0 || data.grades.length > 0,
    reminders: data.reminders.length > 0,
    personalization: settings.theme !== "system"
      || settings.accentColor.toLowerCase() !== "#7c3aed"
      || settings.fontScale !== 1
      || settings.fontFamily !== "sans",
  }
}
