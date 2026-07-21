"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Grade } from "@/lib/types"
export function GradeSimulator({ assessments, onSimulate }: { assessments: Grade[]; onSimulate: (gradeId: string, score: number) => Grade[] }) {
  const [value, setValue] = useState("")
  const pending = assessments.find((grade) => grade.status !== "graded")
  const simulated = pending && value ? onSimulate(pending.id, Number(value)) : null
  return <div className="rounded-lg border p-3 space-y-2"><Label>¿Qué pasa si obtengo X?</Label><Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ej: 5.0" inputMode="decimal" /><p className="text-xs text-muted-foreground">Simulación no persistida{simulated ? ` · ${simulated.length} evaluaciones simuladas` : ""}.</p></div>
}
