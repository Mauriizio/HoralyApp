import type { AppData } from "@/lib/types"

export type TutorialId = "basic-tour" | "schedule-tour" | "grades-tour" | "reminders-tour" | "tools-tour" | "preferences-tour" | "assistant-tour" | "analytics-tour"
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
const tutorial = (id: TutorialId, title: string, steps: readonly TutorialStep[]): TutorialDefinition => ({ id, version: 2, title, steps })

export const TUTORIAL_REGISTRY: Record<TutorialId, TutorialDefinition> = {
  "basic-tour": tutorial("basic-tour", "Recorrido básico", [
    info({ id: "dashboard", title: "Dashboard", description: "Aquí ves lo que ocurre hoy, tu próxima clase, pendientes y el resumen académico.", tab: "dashboard", target: "dashboard-overview" }),
    info({ id: "subjects", title: "Materias", description: "Agrega materias y edita su color, icono y datos sin perder tu organización.", tab: "materias", target: "add-subject" }),
    info({ id: "schedule", title: "Horario", description: "Los módulos definen horas; los bloques asignan una materia a uno o más módulos.", tab: "horario", target: "schedule-grid" }),
    info({ id: "grades", title: "Notas", description: "Elige una estructura, registra evaluaciones y edítalas desde cada materia.", tab: "notas", target: "grades-overview" }),
    info({ id: "reminders", title: "Recordatorios", description: "Crea un recordatorio con fecha y revisa aquí sus próximos vencimientos.", tab: "recordatorios", target: "reminders-overview" }),
    info({ id: "preferences", title: "Personalización y ayuda", description: "En Preferencias ajustas tema, escala, módulos y puedes reiniciar cualquier tutorial.", tab: "preferencias", target: "learning-settings" }),
  ]),
  "schedule-tour": tutorial("schedule-tour", "Cómo usar Horario", [
    info({ id: "modules", title: "Módulos horarios", description: "Cada módulo representa un tramo de tiempo. Sus horas se cambian en Preferencias.", target: "schedule-grid" }),
    action({ id: "block", title: "Crea un bloque", description: "Haz clic en una celda vacía para abrir el selector de materias.", target: "schedule-empty-cell", requiredEvent: "schedule-cell-opened", actionLabel: "Haz clic en una celda vacía" }),
    action({ id: "subject", title: "Elige una materia", description: "Haz clic en una materia real para asignarla a este bloque.", target: "schedule-subject-picker", requiredEvent: "schedule-subject-selected", actionLabel: "Haz clic en una materia" }),
    info({ id: "edit", title: "Edita tus bloques", description: "Desde un bloque existente puedes editarlo, moverlo o eliminarlo.", target: "schedule-grid" }),
  ]),
  "grades-tour": tutorial("grades-tour", "Cómo configurar Notas", [
    action({ id: "structure", title: "Configura la estructura", description: "Abre la configuración para elegir evaluación continua o parciales y transversal.", target: "grades-configure", requiredEvent: "grades-dialog-opened", actionLabel: "Haz clic en Configurar" }),
    info({ id: "assessment", title: "Registra evaluaciones", description: "Cada evaluación pertenece a un grupo y tiene una ponderación interna; luego puedes editarla o eliminarla.", target: "grades-overview" }),
    info({ id: "average", title: "Interpreta tu promedio", description: "El promedio mostrado usa únicamente tus evaluaciones y la estructura configurada.", target: "grades-overview" }),
  ]),
  "reminders-tour": tutorial("reminders-tour", "Cómo usar Recordatorios", [
    action({ id: "create", title: "Crea un recordatorio", description: "Abre el formulario para escribir título, fecha, hora y prioridad.", target: "reminder-create", requiredEvent: "reminder-dialog-opened", actionLabel: "Haz clic en Crear recordatorio" }),
    info({ id: "appear", title: "Dónde aparecen", description: "Al guardar, los vencimientos aparecen aquí y alimentan tu resumen del Dashboard.", target: "reminders-overview" }),
  ]),
  "tools-tour": tutorial("tools-tour", "Herramientas académicas", [
    info({ id: "catalog", title: "Catálogo", description: "Busca herramientas disponibles por nombre o categoría.", target: "tools-catalog" }),
    info({ id: "resistor", title: "Código de resistencias", description: "Abre la herramienta de código de colores y vuelve al catálogo cuando termines. Añadiremos más herramientas.", target: "tools-catalog" }),
  ]),
  "preferences-tour": tutorial("preferences-tour", "Preferencias", [
    info({ id: "appearance", title: "Apariencia", description: "Ajusta tema, idioma, tipografía y escala de interfaz.", target: "preferences-overview" }),
    info({ id: "academic", title: "Configuración académica", description: "Configura escala de notas y módulos horarios.", target: "preferences-overview" }),
    info({ id: "learning", title: "Ayuda y tutoriales", description: "Desde aquí puedes restaurar Primeros pasos y reiniciar cualquier tutorial.", target: "learning-settings" }),
  ]),
  "assistant-tour": tutorial("assistant-tour", "Cómo usar Horarily", [
    info({ id: "capabilities", title: "Asistente académico guiado", description: "Puedo ayudarte con materias, horario, notas, recordatorios y navegación. No soy un chatbot general.", target: "assistant-history" }),
    info({ id: "quick-actions", title: "Acciones rápidas", description: "Usa estas acciones para pedir algo sin escribir frases.", target: "assistant-quick-actions" }),
    info({ id: "input", title: "Escribe una solicitud", description: "También puedes escribir qué necesitas en lenguaje natural.", target: "assistant-input" }),
    info({ id: "confirm", title: "Confirma o cancela", description: "Las acciones que cambian datos siempre piden confirmación. Puedes responder sí, no o corregir.", target: "assistant-input" }),
    info({ id: "advanced", title: "Comandos avanzados", description: "Los comandos existentes siguen disponibles en este panel.", target: "assistant-advanced-commands" }),
    info({ id: "limits", title: "Capacidades claras", description: "Si no entiendo una solicitud, te mostraré las acciones reales que puedo ejecutar.", target: "assistant-quick-actions" }),
  ]),
  "analytics-tour": tutorial("analytics-tour", "Analítica académica", [
    info({ id: "real-data", title: "Tus tendencias", description: "Esta vista resume información real de tus evaluaciones y materias; no usa datos de ejemplo.", target: "analytics-overview" }),
  ]),
}

export function buildTutorialStorageKey(identity: string, authGeneration: number) {
  return `horarily:tutorials:v1:${encodeURIComponent(identity)}:${authGeneration}`
}

export function normalizeTutorialProgress(definition: TutorialDefinition, progress?: Partial<TutorialProgress>): TutorialProgress {
  if (!progress || progress.version !== definition.version) return { version: definition.version, status: "not-started", currentStep: 0 }
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
