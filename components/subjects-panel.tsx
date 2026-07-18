"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/i18n-provider"
import { DIFFICULTY_LABELS, type Subject } from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { SubjectForm } from "@/components/subject-form"
import { commandKeyForSubjectName, ensureUniqueCommandKey, normalizeCommandKey } from "@/lib/command-key"

export function SubjectsPanel({ store }: { store: ScheduleStore }) {
  const { t } = useI18n()
  const { data, addSubject, updateSubject, deleteSubject } = store

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | undefined>()

  const ordered = useMemo(
    () =>
      [...data.subjects].sort((a, b) => {
        if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty
        return a.name.localeCompare(b.name)
      }),
    [data.subjects],
  )

  const openNew = () => {
    setEditing(undefined)
    setOpen(true)
  }

  const openEdit = (s: Subject) => {
    setEditing(s)
    setOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t("tabs.subjects")}</h2>
          <p className="text-sm text-muted-foreground">{t("subject.count", { count: data.subjects.length })}</p>
        </div>
        <Button onClick={openNew}>{t("subject.create")}</Button>
      </div>

      {ordered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("subject.empty")}</EmptyTitle>
            <EmptyDescription>{t("subject.emptyDesc")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((s) => {
            return (
              <Card key={s.id} className="relative overflow-hidden transition hover:shadow-md">
                <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: s.color }} />
                <CardHeader className="pb-2 pl-5 pr-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {DIFFICULTY_LABELS[s.difficulty]}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteSubject(s.id)}
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
                    {s.commandKey && (
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        /{s.commandKey}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent />
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
          const commandKey = editing
            ? ensureUniqueCommandKey(values.commandKey ?? editing.commandKey ?? editing.name, data.subjects, {
                excludeSubjectId: editing.id,
                fallbackName: values.name,
              })
            : ensureUniqueCommandKey(
                values.commandKey ? normalizeCommandKey(values.commandKey) : commandKeyForSubjectName(values.name, data.subjects),
                data.subjects,
                { fallbackName: values.name },
              )
          const nextValues = { ...values, commandKey }
          if (editing) updateSubject(editing.id, nextValues)
          else addSubject(nextValues)
        }}
      />
    </div>
  )
}