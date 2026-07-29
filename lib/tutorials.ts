import type { AppData } from "@/lib/types"

export type TutorialId = "basic-tour" | "schedule-tour" | "grades-tour" | "reminders-tour" | "tools-tour" | "preferences-tour" | "analytics-tour"
export type TutorialStatus = "not-started" | "in-progress" | "completed" | "skipped"

export interface TutorialStep {
  id: string
  title: string
  description: string
  target?: string
  tab?: string
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

const tutorial = (id: TutorialId, title: string, steps: readonly TutorialStep[]): TutorialDefinition => ({ id, version: 1, title, steps })

export const TUTORIAL_REGISTRY: Record<TutorialId, TutorialDefinition> = {
  "basic-tour": tutorial("basic-tour", "Recorrido básico", [
    { id: "dashboard", title: "Dashboard", description: "Aquí ves lo que ocurre hoy, tu próxima clase, pendientes y el resumen académico.", tab: "dashboard", target: "dashboard-overview" },
    { id: "subjects", title: "Materias", description: "Agrega materias y edita su color, icono y datos sin perder tu organización.", tab: "materias", target: "add-subject" },
    { id: "schedule", title: "Horario", description: "Los módulos definen horas; los bloques asignan una materia a uno o más módulos.", tab: "horario", target: "schedule-grid" },
    { id: "grades", title: "Notas", description: "Elige una estructura, registra evaluaciones y edítalas desde cada materia.", tab: "notas", target: "grades-overview" },
    { id: "reminders", title: "Recordatorios", description: "Crea un recordatorio con fecha y revisa aquí sus próximos vencimientos.", tab: "recordatorios", target: "reminders-overview" },
    { id: "preferences", title: "Personalización y ayuda", description: "En Preferencias ajustas tema, escala, módulos y puedes reiniciar cualquier tutorial.", tab: "preferencias", target: "learning-settings" },
  ]),
  "schedule-tour": tutorial("schedule-tour", "Cómo usar Horario", [
    { id: "modules", title: "Módulos horarios", description: "Cada módulo representa un tramo de tiempo. Sus horas se cambian en Preferencias.", target: "schedule-grid" },
    { id: "block", title: "Bloques", description: "Selecciona un espacio para crear un bloque y asignarle una materia.", target: "schedule-grid" },
    { id: "subject", title: "Asignación", description: "Un bloque siempre usa una materia real de tu semestre activo.", target: "schedule-grid" },
  ]),
  "grades-tour": tutorial("grades-tour", "Cómo configurar Notas", [
    { id: "structure", title: "Estructura", description: "Define grupos como Presentación o Transversal y su ponderación final.", target: "grades-overview" },
    { id: "assessment", title: "Evaluaciones", description: "Registra cada evaluación con su peso interno; luego podrás editarla.", target: "grades-overview" },
  ]),
  "reminders-tour": tutorial("reminders-tour", "Cómo usar Recordatorios", [
    { id: "create", title: "Crear", description: "Añade un recordatorio con fecha, prioridad y estado disponible.", target: "reminders-overview" },
    { id: "appear", title: "Dónde aparecen", description: "Los vencimientos se muestran aquí y alimentan tu resumen del Dashboard.", target: "reminders-overview" },
  ]),
  "tools-tour": tutorial("tools-tour", "Herramientas académicas", [
    { id: "catalog", title: "Catálogo", description: "Busca herramientas disponibles por nombre o categoría.", target: "tools-catalog" },
    { id: "resistor", title: "Código de resistencias", description: "Abre la herramienta de código de colores. Añadiremos más herramientas al catálogo.", target: "tools-catalog" },
  ]),
  "preferences-tour": tutorial("preferences-tour", "Preferencias", [
    { id: "appearance", title: "Apariencia", description: "Ajusta tema, idioma, tipografía y escala de interfaz.", target: "preferences-overview" },
    { id: "academic", title: "Configuración académica", description: "Configura escala de notas, módulos y opciones disponibles.", target: "preferences-overview" },
  ]),
  "analytics-tour": tutorial("analytics-tour", "Analítica académica", [
    { id: "real-data", title: "Tus tendencias", description: "Esta vista resume información real de tus evaluaciones y materias; no usa datos de ejemplo.", target: "analytics-overview" },
  ]),
}

export function buildTutorialStorageKey(identity: string, authGeneration: number) {
  return `horarily:tutorials:v1:${encodeURIComponent(identity)}:${authGeneration}`
}

export function normalizeTutorialProgress(definition: TutorialDefinition, progress?: Partial<TutorialProgress>): TutorialProgress {
  if (!progress || progress.version !== definition.version) {
    return { version: definition.version, status: "not-started", currentStep: 0 }
  }
  return {
    version: definition.version,
    status: progress.status ?? "not-started",
    currentStep: Math.min(Math.max(progress.currentStep ?? 0, 0), definition.steps.length - 1),
    updatedAt: progress.updatedAt,
  }
}

export function getFirstStepsCompletion(data: AppData) {
  const defaultSettings = data.settings
  return {
    subject: data.subjects.length > 0,
    schedule: data.blocks.length > 0,
    grades: data.assessmentGroups.length > 0 || data.grades.length > 0,
    reminders: data.reminders.length > 0,
    personalization:
      defaultSettings.theme !== "system"
      || defaultSettings.accentColor.toLowerCase() !== "#7c3aed"
      || defaultSettings.fontScale !== 1
      || defaultSettings.fontFamily !== "sans",
  }
}
