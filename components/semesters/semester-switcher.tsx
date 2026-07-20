"use client"

import { CalendarDays, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { getAvailableSemesters } from "@/application/semesters"

function formatRange(startsOn?: string, endsOn?: string) {
  if (startsOn && endsOn) return `${startsOn} → ${endsOn}`
  if (startsOn) return `Desde ${startsOn}`
  if (endsOn) return `Hasta ${endsOn}`
  return null
}

export function SemesterSwitcher({ store, onManage }: { store: ScheduleStore; onManage: () => void }) {
  const active = store.allData.semesters.find((semester) => semester.id === store.allData.activeSemesterId)
  const available = getAvailableSemesters(store.allData.semesters)
  const range = formatRange(active?.startsOn, active?.endsOn)

  const changeSemester = (id: string) => {
    if (id === store.allData.activeSemesterId) return
    const next = store.allData.semesters.find((semester) => semester.id === id)
    try {
      store.selectActiveSemester(id)
      toast.success(`Semestre activo: ${next?.name ?? "seleccionado"}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el semestre.")
    }
  }

  if (!active) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline"><CalendarDays className="mr-1 h-3 w-3" />Sin semestre activo</Badge>
        <Button size="sm" variant="outline" onClick={onManage}>Gestionar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Semestre activo</p>
        <p className="truncate text-sm font-medium">{active.name}</p>
        {range && <p className="text-xs text-muted-foreground">{range}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Cambiar semestre activo">
            Cambiar <ChevronsUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Semestres disponibles</DropdownMenuLabel>
          {available.length === 0 ? (
            <DropdownMenuItem disabled>No hay semestres disponibles</DropdownMenuItem>
          ) : available.map((semester) => (
            <DropdownMenuItem key={semester.id} onClick={() => changeSemester(semester.id)} aria-label={`Activar ${semester.name}`}>
              <span className="min-w-0 flex-1 truncate">{semester.name}</span>
              {semester.id === active.id && <Check className="ml-2 h-4 w-4" aria-hidden="true" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManage}>Gestionar semestres</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="ghost" onClick={onManage}>Gestionar</Button>
    </div>
  )
}
