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
import { DAYS, type DayKey, type StudyBlock, type Subject } from "@/lib/types"

export interface StudyBlockFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  initial?: StudyBlock
  onSubmit: (values: Omit<StudyBlock, "id">) => void
}

export function StudyBlockForm({
  open,
  onOpenChange,
  subjects,
  initial,
  onSubmit,
}: StudyBlockFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [day, setDay] = useState<DayKey>(initial?.day ?? "lunes")
  const [start, setStart] = useState(initial?.start ?? "18:30")
  const [end, setEnd] = useState(initial?.end ?? "20:00")
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "_none")
  const [notes, setNotes] = useState(initial?.notes ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      day,
      start,
      end,
      subjectId: subjectId === "_none" ? undefined : subjectId,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar bloque de estudio" : "Nuevo bloque de estudio"}</DialogTitle>
          <DialogDescription>
            Aparte de tus clases, agenda tiempo para estudiar por tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sb-title">¿Qué vas a estudiar?</Label>
            <Input
              id="sb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Repasar fracciones"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3">
              <Label htmlFor="sb-day">Día</Label>
              <Select value={day} onValueChange={(v) => setDay(v as DayKey)}>
                <SelectTrigger id="sb-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-start">Inicio</Label>
              <Input
                id="sb-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-end">Fin</Label>
              <Input
                id="sb-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-subject">Materia</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="sb-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Ninguna</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sb-notes">Notas</Label>
            <Textarea
              id="sb-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: practicar problemas del capítulo 3…"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? "Guardar" : "Crear bloque"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
