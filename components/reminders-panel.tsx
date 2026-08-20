"use client"

import { useMemo, useState } from "react"
import { Bell, Plus, Trash2, Pencil, AlertTriangle, CalendarDays, ClipboardCheck, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Reminder } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { ReminderForm } from "@/components/reminder-form"

function formatDate(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("es-419", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function RemindersPanel({ store }: { store: ScheduleStore }) {
  const { data, addReminder, updateReminder, deleteReminder, subjectsById } = store
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | undefined>()

  const sorted = useMemo(
    () =>
      [...data.reminders].sort(
        (a, b) =>
          new Date(a.targetDateTime).getTime() - new Date(b.targetDateTime).getTime(),
      ),
    [data.reminders],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recordatorios</h2>
          <p className="text-sm text-muted-foreground">
            Avisos para tareas, pruebas y eventos importantes.
          </p>
        </div>
        <Button
          data-tour="reminder-create"
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
            window.dispatchEvent(new CustomEvent("horarily:tutorial-action", { detail: { type: "reminder-dialog-opened" } }))
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo recordatorio
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes recordatorios. Crea uno para no olvidar fechas importantes.
          </CardContent>
        </Card>
      ) : (
        <div data-tour="reminders-list" className="space-y-2">
          {sorted.map((r) => {
            const subject = r.subjectId ? subjectsById.get(r.subjectId) : undefined
            const highPriority = r.priority === "alta"
            return (
              <Card
                key={r.id}
                className={cn(
                  "transition",
                  highPriority &&
                    "border-destructive/60 ring-1 ring-destructive/30 shadow-sm",
                )}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                        highPriority
                          ? "bg-destructive/15 text-destructive"
                          : r.priority === "media"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {highPriority ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{r.title}</span>
                            <PriorityBadge priority={r.priority} />
                            <KindBadge kind={r.kind ?? "general"} />
                            {subject && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5"
                                style={{
                                  backgroundColor: `${subject.color}22`,
                                  color: subject.color,
                                }}
                              >
                                {subject.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                            {formatDate(r.targetDateTime)}
                          </div>
                          {r.description && (
                            <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                              {r.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {r.triggers.map((t, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] font-normal"
                              >
                                {triggerLabel(t)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditing(r)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive"
                            onClick={() => deleteReminder(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ReminderForm
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        subjects={data.subjects}
        initial={editing}
        timezone={data.profile.timezone}
        onSubmit={(values) => {
          if (editing) updateReminder(editing.id, values)
          else addReminder(values)
        }}
      />
    </div>
  )
}

function KindBadge({ kind }: { kind: NonNullable<Reminder["kind"]> }) {
  if (kind === "general") return null
  const config = {
    assessment: { label: "Evaluación", Icon: GraduationCap },
    assignment: { label: "Entrega", Icon: ClipboardCheck },
    event: { label: "Evento", Icon: CalendarDays },
  }[kind]
  return <Badge variant="outline" className="gap-1 text-[10px] font-normal"><config.Icon className="size-3" />{config.label}</Badge>
}

function PriorityBadge({ priority }: { priority: Reminder["priority"] }) {
  const map: Record<Reminder["priority"], { label: string; cls: string }> = {
    alta: {
      label: "Alta",
      cls: "bg-destructive text-destructive-foreground border-destructive",
    },
    media: { label: "Media", cls: "bg-primary/10 text-primary border-primary/30" },
    baja: { label: "Baja", cls: "bg-muted text-muted-foreground border-border" },
  }
  const { label, cls } = map[priority]
  return <Badge className={cn("uppercase text-[10px] h-4 px-1.5", cls)}>{label}</Badge>
}

function triggerLabel(t: Reminder["triggers"][number]) {
  switch (t.kind) {
    case "hoursBefore":
      return `${t.hours}h antes`
    case "dayBefore":
      return "1 día antes"
    case "customDateTime":
      return `Custom: ${new Date(t.datetime).toLocaleString("es-419", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
  }
}
