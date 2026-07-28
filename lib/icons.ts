import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type IconComponent = LucideIcon

export const SUBJECT_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin ícono" },
  { value: "BookOpen", label: "Libro" },
  { value: "NotebookText", label: "Cuaderno" },
  { value: "PenTool", label: "Escritura" },
  { value: "Calculator", label: "Calculadora" },
  { value: "FlaskConical", label: "Laboratorio" },
  { value: "Atom", label: "Ciencia" },
  { value: "Microscope", label: "Investigación" },
  { value: "Globe", label: "Geografía" },
  { value: "Landmark", label: "Historia" },
  { value: "Languages", label: "Idiomas" },
  { value: "Palette", label: "Arte" },
  { value: "Music", label: "Música" },
  { value: "Drama", label: "Teatro" },
  { value: "Dumbbell", label: "Deporte" },
  { value: "HeartPulse", label: "Salud" },
  { value: "Monitor", label: "Informática" },
  { value: "Code", label: "Programación" },
  { value: "BriefcaseBusiness", label: "Economía" },
  { value: "Scale", label: "Derecho" },
  { value: "Leaf", label: "Naturaleza" },
  { value: "Wrench", label: "Taller" },
  { value: "Bolt", label: "Electricidad" },
  { value: "Zap", label: "Rayo" },
  { value: "CircuitBoard", label: "Circuito" },
  { value: "Activity", label: "Resistencia" },
  { value: "PlugZap", label: "Enchufe" },
  { value: "Lightbulb", label: "Bombilla" },
  { value: "Workflow", label: "Automatización" },
  { value: "Cpu", label: "Microchip" },
  { value: "Cog", label: "Engranaje" },
  { value: "Hammer", label: "Herramientas" },
  { value: "Map", label: "Planos" },
  { value: "Ruler", label: "Regla" },
  { value: "Orbit", label: "Física" },
  { value: "TestTubeDiagonal", label: "Química" },
  { value: "Presentation", label: "Presentación" },
  { value: "FolderKanban", label: "Proyecto" },
  { value: "DraftingCompass", label: "Dibujo técnico" },
]

function normalizeIconKey(icon: string) {
  return icon.replace(/[-_\s]/g, "").toLowerCase()
}

export function getLucideIcon(icon?: string): IconComponent | null {
  if (!icon) return null

  const dict = Icons as unknown as Record<string, IconComponent>
  if (dict[icon]) return dict[icon]

  const normalizedTarget = normalizeIconKey(icon)
  for (const [key, value] of Object.entries(dict)) {
    if (normalizeIconKey(key) === normalizedTarget) return value
  }

  return null
}
