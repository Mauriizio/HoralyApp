import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Settings2,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export const APP_TABS = [
  "dashboard",
  "horario",
  "materias",
  "estudio",
  "recordatorios",
  "notas",
  "herramientas",
  "onboarding",
  "analitica",
  "preferencias",
] as const

export type AppTab = (typeof APP_TABS)[number]

export interface NavigationItem {
  id: AppTab
  label: string
  icon: LucideIcon
  mobilePrimary?: boolean
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, mobilePrimary: true },
  { id: "horario", label: "Horario", icon: CalendarDays, mobilePrimary: true },
  { id: "materias", label: "Asignaturas", icon: BookOpen, mobilePrimary: true },
  { id: "recordatorios", label: "Pendientes", icon: Bell, mobilePrimary: true },
  { id: "estudio", label: "Estudio", icon: BookMarked },
  { id: "notas", label: "Notas", icon: GraduationCap },
  { id: "analitica", label: "Analítica", icon: BarChart3 },
  { id: "herramientas", label: "Herramientas", icon: Wrench },
  { id: "preferencias", label: "Preferencias", icon: Settings2 },
]

export function isAppTab(value: string | null): value is AppTab {
  return value !== null && APP_TABS.some((tab) => tab === value)
}

export function getTabUrl(tab: AppTab, currentSearch = "") {
  const params = new URLSearchParams(currentSearch)
  params.set("tab", tab)
  return `?${params.toString()}`
}
