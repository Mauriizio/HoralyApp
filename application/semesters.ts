import type { AppData, Semester } from "@/lib/types"

export function ensureSingleActiveSemester(semesters: Semester[]): Semester[] {
  const active = semesters.find((s) => s.status === "active")
  if (!active) return semesters
  return semesters.map((s) => s.id === active.id ? { ...s, status: "active" } : { ...s, status: s.status === "active" ? "planned" : s.status })
}

export function migrateLegacyDataToInitialSemester(data: AppData): AppData {
  if (data.semesters.length > 0) return data
  const semester: Semester = { id: "initial-semester", name: "Semestre inicial", status: "active", createdAt: Date.now() }
  return {
    ...data,
    semesters: [semester],
    activeSemesterId: semester.id,
    subjects: data.subjects.map((s) => ({ ...s, semesterId: s.semesterId ?? semester.id })),
    blocks: data.blocks.map((b) => ({ ...b, semesterId: b.semesterId ?? semester.id })),
    studyBlocks: data.studyBlocks.map((b) => ({ ...b, semesterId: b.semesterId ?? semester.id })),
    reminders: data.reminders.map((r) => ({ ...r, semesterId: r.semesterId ?? semester.id })),
    grades: data.grades.map((g) => ({ ...g, semesterId: g.semesterId ?? semester.id })),
  }
}

export function filterDataByActiveSemester(data: AppData): AppData {
  const active = data.activeSemesterId
  if (!active) return data
  const subjects = data.subjects.filter((s) => s.semesterId === active || !s.semesterId)
  const subjectIds = new Set(subjects.map((s) => s.id))
  return {
    ...data,
    subjects,
    blocks: data.blocks.filter((b) => (b.semesterId === active || !b.semesterId) && subjectIds.has(b.subjectId)),
    studyBlocks: data.studyBlocks.filter((b) => b.semesterId === active || !b.semesterId),
    reminders: data.reminders.filter((r) => r.semesterId === active || !r.semesterId),
    grades: data.grades.filter((g) => (g.semesterId === active || !g.semesterId) && subjectIds.has(g.subjectId)),
  }
}
