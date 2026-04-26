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
import { type DifficultyLevel, DIFFICULTY_LABELS, type Subject } from "@/lib/types"
import { getLucideIcon, SUBJECT_ICON_OPTIONS } from "@/lib/icons"

const SUBJECT_COLORS = [
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#6366f1", // indigo
  "#64748b", // slate
  "#0d9488", // teal-600
]

export interface SubjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Subject
  onSubmit: (values: Omit<Subject, "id" | "createdAt">) => void
}

export function SubjectForm({ open, onOpenChange, initial, onSubmit }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [color, setColor] = useState(initial?.color ?? SUBJECT_COLORS[0])
  const [icon, setIcon] = useState(initial?.icon ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initial?.difficulty ?? 3)
  const selectedIcon = SUBJECT_ICON_OPTIONS.find((opt) => opt.value === icon)

  // When dialog opens with a different subject, sync local state.
  // useEffect avoided: we reset via `key` prop in parent if needed.

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      color,
      icon: icon || undefined,
      notes: notes.trim() || undefined,
      difficulty,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar materia" : "Nueva materia"}</DialogTitle>
          <DialogDescription>
            Crea una materia para ubicarla después en tu horario semanal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">Nombre</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Matemáticas"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Seleccionar color ${c}`}
                />
              ))}
              <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1 cursor-pointer">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Elegir color personalizado"
                />
                <span className="text-xs text-muted-foreground">Personalizado</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subject-icon">Ícono</Label>
              <Select value={icon || "_none"} onValueChange={(v) => setIcon(v === "_none" ? "" : v)}>
                <SelectTrigger id="subject-icon">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      {icon ? (
                        (() => {
                          const IconComp = getLucideIcon(icon)
                          return IconComp ? <IconComp className="h-4 w-4" /> : null
                        })()
                      ) : null}
                      <span>{selectedIcon?.label ?? "Sin ícono"}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_ICON_OPTIONS.map((opt) => {
                    const IconComp = getLucideIcon(opt.value)
                    return (
                    <SelectItem key={opt.value || "_none"} value={opt.value || "_none"}>
                      <span className="flex items-center gap-2">
                        {IconComp ? <IconComp className="h-4 w-4" /> : null}
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-difficulty">Dificultad</Label>
              <Select
                value={String(difficulty)}
                onValueChange={(v) => setDifficulty(Number(v) as DifficultyLevel)}
              >
                <SelectTrigger id="subject-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      {lvl} — {DIFFICULTY_LABELS[lvl]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-notes">Notas</Label>
            <Textarea
              id="subject-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: traer guía de ejercicios, hay evaluación el viernes…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? "Guardar cambios" : "Crear materia"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
