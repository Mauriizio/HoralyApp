"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Pencil, GripVertical, Bell, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
  DAYS,
  DAY_KEYS,
  type DayKey,
  type Reminder,
  type ScheduleBlock,
  type Subject,
  type TimeModule,
} from "@/lib/types"
import type { ScheduleStore } from "@/hooks/use-schedule-store"
import { cn } from "@/lib/utils"
import { getLucideIcon } from "@/lib/icons"
import { formatTime } from "@/lib/time-format"

interface ScheduleGridProps {
  store: ScheduleStore
  onNewSubject: () => void
  onEditSubject: (subject: Subject) => void
  restrictedDay?: DayKey // focus mode
  showSaturday?: boolean
  timeFormat?: "12h" | "24h"
  reminders?: Reminder[]
  onOpenReminders?: () => void
}

export function ScheduleGrid({
  store,
  onNewSubject,
  onEditSubject,
  restrictedDay,
  showSaturday = false,
  timeFormat = "24h",
  reminders = [],
  onOpenReminders,
}: ScheduleGridProps) {
  const { data, upsertBlock, deleteBlock, moveBlock, subjectsById } = store
  const { subjects, blocks, studyBlocks, modules } = data

  const classDays = useMemo(
    () =>
      DAYS.filter((d) =>
        showSaturday
          ? d.key !== "domingo"
          : ["lunes", "martes", "miercoles", "jueves", "viernes"].includes(d.key),
      ),
    [showSaturday],
  )
  const daysToShow = restrictedDay ? classDays.filter((d) => d.key === restrictedDay) : classDays

  const cognitiveLoadByDay = useMemo(() => {
    const map = Object.fromEntries(DAY_KEYS.map((day) => [day, 0])) as Record<DayKey, number>
    for (const b of blocks) {
      const subject = subjectsById.get(b.subjectId)
      if (!subject) continue
      map[b.day] += b.moduleIds.length * subject.difficulty
    }
    return map
  }, [blocks, subjectsById])

  const maxLoad = Math.max(1, ...Object.values(cognitiveLoadByDay))

  // For each (day, moduleId), figure out the occupying block's "startModuleId"
  // and whether this cell is the first cell for that block.
  const cellInfo = useMemo(() => {
    const map = new Map<
      string,
      { block: ScheduleBlock; isStart: boolean; span: number }
    >()
    for (const b of blocks) {
      const sorted = [...b.moduleIds].sort(
        (a, z) =>
          modules.findIndex((m) => m.id === a) -
          modules.findIndex((m) => m.id === z),
      )
      sorted.forEach((mid, idx) => {
        map.set(`${b.day}:${mid}`, {
          block: b,
          isStart: idx === 0,
          span: sorted.length,
        })
      })
    }
    return map
  }, [blocks, modules])

  const studyBlocksByDay = useMemo(() => {
    const map = Object.fromEntries(
      DAY_KEYS.map((day) => [day, [] as typeof studyBlocks]),
    ) as Record<DayKey, typeof studyBlocks>
    for (const sb of studyBlocks) map[sb.day].push(sb)
    for (const key of Object.keys(map) as DayKey[]) {
      map[key].sort((a, b) => a.start.localeCompare(b.start))
    }
    return map
  }, [studyBlocks])

  return (
    <div className="w-full">
      {/* Cognitive load header (desktop) */}
      <div className="hidden md:block mb-3">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `120px repeat(${daysToShow.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="text-xs font-medium text-muted-foreground flex items-end">
            Carga del día
          </div>
          {daysToShow.map((d) => {
            const load = cognitiveLoadByDay[d.key]
            const pct = Math.round((load / maxLoad) * 100)
            const level =
              load === 0
                ? "ninguna"
                : load < maxLoad * 0.4
                  ? "ligera"
                  : load < maxLoad * 0.75
                    ? "media"
                    : "alta"
            return (
              <div key={d.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{d.label}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] h-5",
                      level === "alta" &&
                        "bg-destructive/15 text-destructive border-destructive/30",
                      level === "media" && "bg-primary/10 text-primary border-primary/20",
                    )}
                  >
                    {level === "ninguna" ? "Libre" : `Carga ${level}`}
                  </Badge>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        level === "alta"
                          ? "var(--destructive)"
                          : level === "media"
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop schedule grid with explicit row/column placement */}
      <div
        className="hidden md:grid gap-1"
        style={{
          gridTemplateColumns: `120px repeat(${daysToShow.length}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${modules.length}, minmax(56px, auto)) auto`,
        }}
      >
        {/* Header row */}
        <div style={{ gridRow: 1, gridColumn: 1 }} />
        {daysToShow.map((d, i) => (
          <div
            key={d.key}
            style={{ gridRow: 1, gridColumn: i + 2 }}
            className="px-2 py-2 text-center text-sm font-semibold border-b border-border"
          >
            {d.label}
          </div>
        ))}

        {/* Time column */}
        {modules.map((mod, mi) => (
          <div
            key={mod.id}
            style={{ gridRow: mi + 2, gridColumn: 1 }}
            className="flex flex-col justify-center px-2 py-2 text-xs text-muted-foreground border-r border-border"
          >
            <div className="font-mono font-medium text-foreground">
              {formatTime(mod.start, timeFormat)}
            </div>
            <div className="font-mono text-[11px]">{formatTime(mod.end, timeFormat)}</div>
            <div className="text-[10px] uppercase tracking-wide mt-0.5">{mod.label}</div>
          </div>
        ))}

        {/* Day cells */}
        {daysToShow.map((d, di) =>
          modules.map((mod, mi) => {
            const info = cellInfo.get(`${d.key}:${mod.id}`)
            if (info && !info.isStart) return null // occupied by spanning block
            if (info) {
              const subject = subjectsById.get(info.block.subjectId)
              if (!subject) return null
              return (
                <div
                  key={`${d.key}-${mod.id}`}
                  style={{
                    gridColumn: di + 2,
                    gridRow: `${mi + 2} / span ${info.span}`,
                  }}
                  className="p-1"
                >
                  <BlockPill
                    block={info.block}
                    subject={subject}
                    reminderCount={reminders.filter((r) => r.subjectId === subject.id).length}
                    onEdit={() => onEditSubject(subject)}
                    onDelete={() => deleteBlock(info.block.id)}
                    onOpenReminders={onOpenReminders}
                  />
                </div>
              )
            }
            return (
              <div
                key={`${d.key}-${mod.id}`}
                style={{ gridColumn: di + 2, gridRow: mi + 2 }}
                className="p-1"
              >
                <DropZoneCell
                  day={d.key}
                  moduleId={mod.id}
                  modules={modules}
                  subjects={subjects}
                  upsertBlock={upsertBlock}
                  moveBlock={moveBlock}
                  onNewSubject={onNewSubject}
                />
              </div>
            )
          }),
        )}

        {/* Study blocks footer row */}
        <div
          style={{ gridRow: modules.length + 2, gridColumn: 1 }}
          className="pt-3 text-xs font-medium text-muted-foreground flex items-start"
        >
          Estudio personal
        </div>
        {daysToShow.map((d, i) => (
          <div
            key={`sb-${d.key}`}
            style={{ gridRow: modules.length + 2, gridColumn: i + 2 }}
            className="pt-3 space-y-1.5 min-h-16"
          >
            {studyBlocksByDay[d.key].length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 italic px-1">
                Sin bloques
              </div>
            ) : (
              studyBlocksByDay[d.key].map((sb) => {
                const subject = sb.subjectId ? subjectsById.get(sb.subjectId) : undefined
                return (
                  <div
                    key={sb.id}
                    className="rounded-md border border-dashed border-border bg-card px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {subject && (
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ backgroundColor: subject.color }}
                        />
                      )}
                      <span className="truncate">{sb.title}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {formatTime(sb.start, timeFormat)} – {formatTime(sb.end, timeFormat)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ))}
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-4">
        {daysToShow.map((d) => {
          const load = cognitiveLoadByDay[d.key]
          const pct = Math.round((load / maxLoad) * 100)
          return (
            <div
              key={d.key}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="px-4 py-2 flex items-center justify-between border-b border-border">
                <span className="font-semibold">{d.label}</span>
                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="divide-y divide-border">
                {modules.map((mod) => {
                  const info = cellInfo.get(`${d.key}:${mod.id}`)
                  if (info && !info.isStart) return null
                  const subject = info ? subjectsById.get(info.block.subjectId) : undefined
                  return (
                    <div key={mod.id} className="flex items-stretch">
                      <div className="w-20 shrink-0 px-3 py-2 text-xs text-muted-foreground bg-muted/40">
                        <div>{formatTime(mod.start, timeFormat)}</div>
                        <div className="text-[10px]">{formatTime(mod.end, timeFormat)}</div>
                      </div>
                      <div className="flex-1 p-2">
                        {info && subject ? (
                          <BlockPill
                            block={info.block}
                            subject={subject}
                            reminderCount={reminders.filter((r) => r.subjectId === subject.id).length}
                            onEdit={() => onEditSubject(subject)}
                            onDelete={() => deleteBlock(info.block.id)}
                            onOpenReminders={onOpenReminders}
                          />
                        ) : (
                          <EmptyCell
                            day={d.key}
                            moduleId={mod.id}
                            subjects={subjects}
                            upsertBlock={upsertBlock}
                            onNewSubject={onNewSubject}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
                {studyBlocksByDay[d.key].map((sb) => {
                  const subject = sb.subjectId ? subjectsById.get(sb.subjectId) : undefined
                  return (
                    <div key={sb.id} className="flex items-stretch">
                      <div className="w-20 shrink-0 px-3 py-2 text-xs text-muted-foreground bg-muted/40">
                        <div>{formatTime(sb.start, timeFormat)}</div>
                        <div className="text-[10px]">{formatTime(sb.end, timeFormat)}</div>
                      </div>
                      <div className="flex-1 p-2">
                        <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-sm">
                          <div className="flex items-center gap-1.5 font-medium">
                            {subject && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: subject.color }}
                              />
                            )}
                            {sb.title}
                          </div>
                          <div className="text-xs text-muted-foreground">Estudio personal</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BlockPill({
  block,
  subject,
  reminderCount,
  onEdit,
  onDelete,
  onOpenReminders,
}: {
  block: ScheduleBlock
  subject: Subject
  reminderCount: number
  onEdit: () => void
  onDelete: () => void
  onOpenReminders?: () => void
}) {
  const IconComp = getLucideIcon(subject.icon)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", block.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      className="group relative h-full w-full rounded-md border p-2 text-xs cursor-grab active:cursor-grabbing transition hover:shadow-md hover:-translate-y-0.5 block-opacity"
      style={{
        backgroundColor: `${subject.color}22`,
        borderColor: `${subject.color}66`,
        borderLeftWidth: 4,
        borderLeftColor: subject.color,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {IconComp ? (
            <IconComp className="h-3.5 w-3.5 shrink-0" style={{ color: subject.color }} />
          ) : null}
          <span className="font-semibold truncate">{subject.name}</span>
        </div>
        <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
      </div>
      {subject.notes && (
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{subject.notes}</p>
      )}
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="opacity-70">Dif. {subject.difficulty}</span>
          {subject.notes ? (
            <span title="Tiene notas">
              <StickyNote className="h-3 w-3" />
            </span>
          ) : null}
          {reminderCount > 0 ? (
            <button
              type="button"
              onClick={onOpenReminders}
              className="inline-flex items-center gap-0.5 hover:text-foreground transition"
              title="Ver recordatorios de esta materia"
            >
              <Bell className="h-3 w-3" />
              <span>{reminderCount}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="absolute right-1 top-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition flex gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-0.5 hover:bg-background/80"
          aria-label="Editar materia"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-0.5 hover:bg-destructive/15 hover:text-destructive"
          aria-label="Quitar del horario"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function DropZoneCell({
  day,
  moduleId,
  modules,
  subjects,
  upsertBlock,
  moveBlock,
  onNewSubject,
}: {
  day: DayKey
  moduleId: string
  modules: TimeModule[]
  subjects: Subject[]
  upsertBlock: ScheduleStore["upsertBlock"]
  moveBlock: ScheduleStore["moveBlock"]
  onNewSubject: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className={cn("h-full min-h-14 rounded-md", hover && "drag-over")}
      onDragOver={(e) => {
        e.preventDefault()
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHover(false)
        const blockId = e.dataTransfer.getData("text/plain")
        if (blockId) moveBlock(blockId, day, moduleId, modules)
      }}
    >
      <EmptyCell
        day={day}
        moduleId={moduleId}
        subjects={subjects}
        upsertBlock={upsertBlock}
        onNewSubject={onNewSubject}
      />
    </div>
  )
}

function EmptyCell({
  day,
  moduleId,
  subjects,
  upsertBlock,
  onNewSubject,
}: {
  day: DayKey
  moduleId: string
  subjects: Subject[]
  upsertBlock: ScheduleStore["upsertBlock"]
  onNewSubject: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group h-full min-h-14 w-full rounded-md border border-dashed border-border/70 hover:border-primary hover:bg-accent/40 transition flex items-center justify-center text-muted-foreground"
          aria-label="Agregar materia a esta celda"
        >
          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2">
        <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
          Agregar al horario
        </div>
        {subjects.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Aún no tienes materias.{" "}
            <Button variant="link" className="px-0 h-auto" onClick={onNewSubject}>
              Crear una materia
            </Button>
          </div>
        ) : (
          <div className="max-h-64 overflow-auto">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
                onClick={() => {
                  const block = {
                    id: Math.random().toString(36).slice(2),
                    subjectId: s.id,
                    day,
                    moduleIds: [moduleId],
                  }
                  const result = upsertBlock(block)
                  if (!result.ok) {
                    const confirmed = window.confirm(
                      "Ya existe un bloque en este módulo. ¿Quieres reemplazarlo?",
                    )
                    if (confirmed) upsertBlock(block, { replaceConflicts: true })
                  }
                }}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate flex-1">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">Dif. {s.difficulty}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}