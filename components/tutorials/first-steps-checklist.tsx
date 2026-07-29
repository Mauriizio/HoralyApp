"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp, Circle, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { getFirstStepsCompletion } from "@/lib/tutorials"
import { getPersistentTutorialIdentity } from "@/lib/tutorial-identity"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { AppTab } from "@/components/app-shell/navigation"

export function FirstStepsChecklist({ store, onNavigate }: { store: ScheduleStore; onNavigate: (tab: AppTab) => void }) {
  const { userId } = useAuth()
  const [storageKey, setStorageKey] = useState("")
  const [hidden, setHidden] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const completion = useMemo(() => getFirstStepsCompletion(store.data), [store.data])

  useEffect(() => {
    setStorageKey(`horarily:first-steps:v2:${encodeURIComponent(getPersistentTutorialIdentity(userId, window.localStorage))}`)
  }, [userId])

  useEffect(() => {
    if (!storageKey) return
    setHidden(window.localStorage.getItem(storageKey) === "hidden")
    const restore = () => { window.localStorage.removeItem(storageKey); setHidden(false) }
    window.addEventListener("horarily:restore-checklist", restore)
    return () => window.removeEventListener("horarily:restore-checklist", restore)
  }, [storageKey])

  if (hidden) return null
  const items: { label: string; done: boolean; tab: AppTab }[] = [
    { label: "Primera materia", done: completion.subject, tab: "materias" },
    { label: "Configurar horario", done: completion.schedule, tab: "horario" },
    { label: "Configurar notas de una materia", done: completion.grades, tab: "notas" },
    { label: "Crear un recordatorio", done: completion.reminders, tab: "recordatorios" },
    { label: "Personalizar HORARILY", done: completion.personalization, tab: "preferencias" },
  ]
  return <Card className="mb-4" data-tour="first-steps"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-base">Primeros pasos</CardTitle><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={collapsed ? "Expandir primeros pasos" : "Contraer primeros pasos"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" aria-label="Ocultar primeros pasos" onClick={() => { window.localStorage.setItem(storageKey, "hidden"); setHidden(true) }}><EyeOff className="h-4 w-4" /></Button></div></CardHeader>{!collapsed && <CardContent className="grid gap-1 sm:grid-cols-2">{items.map((item) => <Button key={item.label} variant="ghost" className="h-auto justify-start gap-2 py-2 text-left" onClick={() => onNavigate(item.tab)}>{item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0" />}<span>{item.label}</span></Button>)}</CardContent>}</Card>
}
