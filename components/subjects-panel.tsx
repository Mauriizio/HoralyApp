"use client"

import { useState } from "react"
import * as Icons from "lucide-react"
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DIFFICULTY_LABELS, type Subject } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { SubjectForm } from "@/components/subject-form"

export function SubjectsPanel({ store }: { store: ScheduleStore }) {
  const { data, addSubject, updateSubject, deleteSubject } = store
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | undefined>()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Materias</h2>
          <p className="text-sm text-muted-foreground">
            Las materias de tu semana, con color y dificultad.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva materia
        </Button>
      </div>

      {data.subjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes materias. Crea la primera para comenzar a armar tu horario.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.subjects.map((s) => {
            const Icon = s.icon ? (Icons as Record<string, unknown>)[s.icon] : null
            const IconComp =
              typeof Icon === "function"
                ? (Icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>)
                : null
            return (
              <Card
                key={s.id}
                className="relative overflow-hidden transition hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.color }} />
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-9 w-9 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: `${s.color}22`, color: s.color }}
                      >
                        {IconComp ? <IconComp className="h-4 w-4" /> : (
                          <span className="text-sm font-semibold">
                            {s.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {DIFFICULTY_LABELS[s.difficulty]}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(s)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteSubject(s.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {s.notes && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {s.notes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      Dificultad {s.difficulty}/5
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SubjectForm
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={(values) => {
          if (editing) updateSubject(editing.id, values)
          else addSubject(values)
        }}
      />
    </div>
  )
}
