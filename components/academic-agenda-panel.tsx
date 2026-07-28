"use client"

import { useMemo, useState } from "react"
import {
  AlarmClock,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  GraduationCap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buildAcademicAgenda, type AcademicAgendaItem } from "@/domain/academic-agenda"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import type { AppTab } from "@/components/app-shell/navigation"

const FILTERS = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

const kindMeta = {
  class: { label: "Clase", icon: BookOpen, className: "text-sky-400 bg-sky-400/10" },
  study_block: { label: "Estudio", icon: Clock3, className: "text-violet-400 bg-violet-400/10" },
  reminder: { label: "Recordatorio", icon: Bell, className: "text-amber-400 bg-amber-400/10" },
  assessment: { label: "Evaluación", icon: GraduationCap, className: "text-emerald-400 bg-emerald-400/10" },
  overdue_assessment: { label: "Vencida", icon: AlarmClock, className: "text-destructive bg-destructive/10" },
} as const

export function AcademicAgendaPanel({ store, onNavigate }: { store: ScheduleStore; onNavigate: (tab: AppTab) => void }) {
  const [filter, setFilter] = useState<FilterId>("7")
  const data = store.data
  const now = new Date()

  const agenda = useMemo(
    () =>
      buildAcademicAgenda({
        now,
        semesterId: data.activeSemesterId ?? "",
        timezone: data.profile.timezone,
        subjects: data.subjects.map((subject) => ({ id: subject.id, name: subject.name })),
        assessments: data.grades.map((grade) => ({
          ...grade,
          groupId: grade.groupId ?? "",
          weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
          scheduledDate: grade.date,
          status: grade.status ?? (grade.score === null ? "planned" : "graded"),
        })),
        classes: data.blocks.map((block) => ({
          id: block.id,
          semesterId: block.semesterId,
          subjectId: block.subjectId,
          day: block.day,
          start: data.modules.find((module) => module.id === block.moduleIds[0])?.start ?? "08:00",
          end: data.modules.find((module) => module.id === block.moduleIds.at(-1))?.end ?? "08:45",
          title: data.subjects.find((subject) => subject.id === block.subjectId)?.name,
        })),
        studyBlocks: data.studyBlocks.map((block) => ({ ...block })),
        reminders: data.reminders,
      }),
    [data, now],
  )

  const items = filter === "7" ? agenda.next7Days : agenda.next30Days
  const subjectsById = useMemo(() => new Map(data.subjects.map((subject) => [subject.id, subject])), [data.subjects])

  const openItem = (item: AcademicAgendaItem) => {
    if (item.kind === "class") onNavigate("horario")
    else if (item.kind === "study_block") onNavigate("estudio")
    else if (item.kind === "reminder") onNavigate("recordatorios")
    else onNavigate("notas")
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-4" />
            </span>
            Agenda académica
          </CardTitle>
          <CardDescription>Clases, evaluaciones, estudio y recordatorios próximos.</CardDescription>
        </div>
        <div className="inline-flex rounded-xl border border-border/70 bg-background/50 p-1" aria-label="Rango de agenda">
          {FILTERS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={filter === option.id ? "secondary" : "ghost"}
              className="h-8 rounded-lg px-3"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {items.length > 0 ? (
          <div className="divide-y divide-border/60">
            {items.slice(0, 8).map((item) => {
              const meta = kindMeta[item.kind]
              const Icon = meta.icon
              const subject = item.subjectId ? subjectsById.get(item.subjectId) : undefined
              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={() => openItem(item)}
                  className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.className}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                      <Badge variant="outline" className="h-5 border-border/70 px-1.5 text-[10px] font-medium">
                        {meta.label}
                      </Badge>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={item.startsAt.toISOString()}>
                        {new Intl.DateTimeFormat("es-CL", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: data.profile.timezone || undefined,
                        }).format(item.startsAt)}
                      </time>
                      {subject && <span className="truncate">· {subject.name}</span>}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarDays className="size-5" />
            </span>
            <p className="mt-3 text-sm font-medium">No hay eventos para este período</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Agrega una evaluación, recordatorio o bloque de estudio para organizar tus próximos días.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => onNavigate("recordatorios")}>
              Crear recordatorio
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
