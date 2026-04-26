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
import type { Reminder, ReminderPriority, ReminderTrigger, Subject } from "@/lib/types"

export interface ReminderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  initial?: Reminder
  onSubmit: (values: Omit<Reminder, "id" | "createdAt" | "notifiedTriggerIndexes">) => void
}

export function ReminderForm({
  open,
  onOpenChange,
  subjects,
  initial,
  onSubmit,
}: ReminderFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [subjectId, setSubjectId] = useState<string>(initial?.subjectId ?? "_none")
  const [priority, setPriority] = useState<ReminderPriority>(initial?.priority ?? "media")
  const [targetDateTime, setTargetDateTime] = useState(
    initial?.targetDateTime ?? defaultLocalDateTime(),
  )

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
  const [customDatetime, setCustomDatetime] = useState(
    initialCustom?.datetime ?? defaultLocalDateTime(),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const triggers: ReminderTrigger[] = []
    if (hoursBeforeEnabled) triggers.push({ kind: "hoursBefore", hours: hoursBefore })
    if (dayBeforeEnabled) triggers.push({ kind: "dayBefore" })
    if (customEnabled) triggers.push({ kind: "customDateTime", datetime: customDatetime })

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      subjectId: subjectId === "_none" ? undefined : subjectId,
      priority,
      triggers,
      targetDateTime,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rem-subject">Materia (opcional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="rem-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin materia</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rem-priority">Prioridad</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ReminderPriority)}
              >
                <SelectTrigger id="rem-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rem-date">Fecha y hora del evento</Label>
            <Input
              id="rem-date"
              type="datetime-local"
              value={targetDateTime.slice(0, 16)}
              onChange={(e) => setTargetDateTime(new Date(e.target.value).toISOString())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>¿Cuándo avisarte?</Label>
            <div className="space-y-2 rounded-md border border-input p-3">
              <label className="flex items-center gap-2">
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
              </label>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dayBeforeEnabled}
                  onCheckedChange={(v) => setDayBeforeEnabled(!!v)}
                />
                <span className="text-sm">Avisar 1 día antes</span>
              </label>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={customEnabled}
                  onCheckedChange={(v) => setCustomEnabled(!!v)}
                />
                <span className="text-sm">En una fecha personalizada</span>
                <Input
                  type="datetime-local"
                  value={customDatetime.slice(0, 16)}
                  onChange={(e) =>
                    setCustomDatetime(new Date(e.target.value).toISOString())
                  }
                  className="h-8 flex-1"
                  disabled={!customEnabled}
                />
              </label>
            </div>
          </div>

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

function defaultLocalDateTime() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toISOString()
}
