"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, BookMarked } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DAYS, type StudyBlock } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { StudyBlockForm } from "@/components/study-block-form"

export function StudyBlocksPanel({ store }: { store: ScheduleStore }) {
  const { data, addStudyBlock, updateStudyBlock, deleteStudyBlock, subjectsById } = store
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StudyBlock | undefined>()

  const grouped = useMemo(() => {
    const map = new Map<string, StudyBlock[]>()
    for (const d of DAYS) map.set(d.key, [])
    for (const sb of data.studyBlocks) map.get(sb.day)?.push(sb)
    for (const arr of map.values()) arr.sort((a, b) => a.start.localeCompare(b.start))
    return map
  }, [data.studyBlocks])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bloques de estudio</h2>
          <p className="text-sm text-muted-foreground">
            Tiempo de estudio personal, separado de las clases.
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
          Nuevo bloque
        </Button>
      </div>

      {data.studyBlocks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no tienes bloques de estudio. Agrega uno para planificar tu tiempo de
            repaso o tareas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DAYS.map((d) => {
            const items = grouped.get(d.key) ?? []
            if (items.length === 0) return null
            return (
              <Card key={d.key}>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="space-y-1.5">
                    {items.map((sb) => {
                      const subject = sb.subjectId ? subjectsById.get(sb.subjectId) : undefined
                      return (
                        <div
                          key={sb.id}
                          className="group flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5"
                        >
                          <BookMarked className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {subject && (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: subject.color }}
                                />
                              )}
                              {sb.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {sb.start} – {sb.end}
                              {subject && ` · ${subject.name}`}
                            </div>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditing(sb)
                                setOpen(true)
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:text-destructive"
                              onClick={() => deleteStudyBlock(sb.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <StudyBlockForm
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        subjects={data.subjects}
        initial={editing}
        onSubmit={(values) => {
          if (editing) updateStudyBlock(editing.id, values)
          else addStudyBlock(values)
        }}
      />
    </div>
  )
}
