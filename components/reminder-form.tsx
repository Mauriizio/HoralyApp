"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Reminder, ReminderKind, ReminderPriority, ReminderTrigger, Subject } from "@/lib/types"
import { browserTimezone, defaultLocalDateAndTime, isoToLocalDateAndTime, validateReminderDateTimes } from "@/domain/reminder-datetime"

export interface ReminderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  initial?: Reminder
  timezone?: string
  onSubmit: (values: Omit<Reminder, "id" | "createdAt" | "notifiedTriggerIndexes">) => void
}

export function ReminderForm({
  open,
  onOpenChange,
  subjects,
  initial,
  timezone,
  onSubmit,
}: ReminderFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [subjectId, setSubjectId] = useState<string>(initial?.subjectId ?? "_none")
  const zone = timezone || browserTimezone()
  const initialEvent = initial ? isoToLocalDateAndTime(initial.targetDateTime, zone) : defaultLocalDateAndTime(zone)
  const [priority, setPriority] = useState<ReminderPriority>(initial?.priority ?? "media")
  const [kind, setKind] = useState<ReminderKind>(initial?.kind ?? "general")
  const [eventDate, setEventDate] = useState(initialEvent.date)
  const [eventTime, setEventTime] = useState(initialEvent.time)
  const [error, setError] = useState("")

  const initialHours = initial?.triggers.find((t) => t.kind === "hoursBefore") as
    | { kind: "hoursBefore"; hours: number }
    | undefined
  const initialDay = initial?.triggers.some((t) => t.kind === "dayBefore") ?? false
  const initialCustom = initial?.triggers.find((t) => t.kind === "customDateTime") as
    | { kind: "customDateTime"; datetime: string }
    | undefined

  const [hoursBeforeEnabled, setHoursBeforeEnabled] = useState(!!initialHours)
  const [hoursBefore, setHoursBefore] = useState(initialHours?.hours ?? 2)
  const [dayBeforeEnabled, setDayBeforeEnabled] = useState(initialDay)
  const [customEnabled, setCustomEnabled] = useState(!!initialCustom)
  const initialCustomLocal = initialCustom ? isoToLocalDateAndTime(initialCustom.datetime, zone) : initialEvent
  const [customDate, setCustomDate] = useState(initialCustomLocal.date)
  const [customTime, setCustomTime] = useState(initialCustomLocal.time)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const parsed = validateReminderDateTimes({ eventDate, eventTime, ...(customEnabled ? { customDate, customTime } : {}), timezone: zone })
    if (!parsed.ok) { setError(parsed.error); return }

    const triggers: ReminderTrigger[] = []
    if (hoursBeforeEnabled) triggers.push({ kind: "hoursBefore", hours: hoursBefore })
    if (dayBeforeEnabled) triggers.push({ kind: "dayBefore" })
    if (customEnabled && parsed.customDateTime) triggers.push({ kind: "customDateTime", datetime: parsed.customDateTime })

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      subjectId: subjectId === "_none" ? undefined : subjectId,
      priority,
      kind,
      triggers,
      targetDateTime: parsed.targetDateTime,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar recordatorio" : "Nuevo recordatorio"}</DialogTitle>
          <DialogDescription>
            Te avisaremos en los momentos que elijas antes de que ocurra.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rem-title">Título</Label>
            <Input
              id="rem-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Entregar trabajo de Historia"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)]">
            <div className="space-y-2">
              <Label htmlFor="rem-kind">Tipo</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as ReminderKind)}>
                <SelectTrigger id="rem-kind" className="w-full min-w-0"><SelectValue className="truncate" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="assessment">Evaluación / examen</SelectItem>
                  <SelectItem value="assignment">Entrega / trabajo</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2 sm:col-span-2 sm:row-start-2">
              <Label htmlFor="rem-subject">Materia (opcional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="rem-subject" className="w-full min-w-0" title={subjects.find((subject) => subject.id === subjectId)?.name}>
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin materia</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-start-2 sm:row-start-1">
              <Label htmlFor="rem-priority">Prioridad</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ReminderPriority)}
              >
                <SelectTrigger id="rem-priority" className="w-full min-w-0">
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="rem-date">Fecha del evento</Label><Input id="rem-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="rem-time">Hora</Label><Input id="rem-time" type="time" step={60} value={eventTime} onChange={(e) => setEventTime(e.target.value)} required /></div>
          </div>

          <div className="space-y-2">
            <Label>¿Cuándo avisarte?</Label>
            <div className="space-y-2 rounded-md border border-input p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  checked={hoursBeforeEnabled}
                  onCheckedChange={(v) => setHoursBeforeEnabled(!!v)}
                />
                <span className="text-sm">Avisar</span>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={hoursBefore}
                  onChange={(e) => setHoursBefore(Number(e.target.value) || 1)}
                  className="h-8 w-20"
                  disabled={!hoursBeforeEnabled}
                />
                <span className="text-sm">horas antes</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  checked={dayBeforeEnabled}
                  onCheckedChange={(v) => setDayBeforeEnabled(!!v)}
                />
                <span className="text-sm">Avisar 1 día antes</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={customEnabled}
                    onCheckedChange={(v) => setCustomEnabled(!!v)}
                  />
                  <span className="text-sm">En una fecha personalizada</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <Input aria-label="Fecha personalizada" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="h-8 min-w-0 w-full" disabled={!customEnabled} required={customEnabled} />
                  <Input aria-label="Hora personalizada" type="time" step={60} value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="h-8 min-w-0 w-full" disabled={!customEnabled} required={customEnabled} />
                </div>
              </div>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="rem-desc">Descripción</Label>
            <Textarea
              id="rem-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales…"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? "Guardar" : "Crear recordatorio"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
