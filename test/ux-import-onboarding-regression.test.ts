import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { prepareSharedAcademicImport, validateImportedData } from "../lib/storage.ts"

test("importación académica entre compañeros conserva identidad y datos personales del receptor", () => {
  const imported = {
    ...EMPTY_APP_DATA,
    profile: { displayName: "Persona origen" },
    settings: {
      ...EMPTY_APP_DATA.settings,
      timeFormat: "12h" as const,
      enableSaturday: true,
      visibleScheduleDays: [...EMPTY_APP_DATA.settings.visibleScheduleDays, "sabado" as const],
      googleCalendarConnected: true,
    },
    semesters: [{ id: "s1", name: "Segundo semestre", status: "active" as const, createdAt: 1 }],
    activeSemesterId: "s1",
    subjects: [{ id: "sub1", semesterId: "s1", name: "Electrotecnia", color: "#2563eb", commandKey: "ELECTRO", notes: "nota privada de origen", difficulty: 3 as const, createdAt: 1 }],
    blocks: [{ id: "b1", semesterId: "s1", subjectId: "sub1", day: "lunes" as const, moduleIds: [EMPTY_APP_DATA.modules[0].id] }],
    reminders: [{ id: "r-origin", semesterId: "s1", subjectId: "sub1", title: "Prueba origen", priority: "alta" as const, kind: "assessment" as const, triggers: [], targetDateTime: "2026-09-10T10:00", createdAt: 1, notifiedTriggerIndexes: [] }],
    subjectNotes: [{ id: "n-origin", semesterId: "s1", subjectId: "sub1", title: "Privado origen", content: "contenido", createdAt: 1, updatedAt: 1 }],
  }
  const currentReminder = { id: "r-current", semesterId: "old-sem", subjectId: "old-sub", title: "Mi prueba", priority: "alta" as const, kind: "assessment" as const, triggers: [], targetDateTime: "2026-09-15T10:00", createdAt: 1, notifiedTriggerIndexes: [] }
  const currentGroup = { id: "g-current", semesterId: "old-sem", subjectId: "old-sub", name: "Parciales", kind: "continuous" as const, courseWeight: 100, position: 1, createdAt: 1 }
  const currentGrade = { id: "grade-current", semesterId: "old-sem", subjectId: "old-sub", groupId: "g-current", title: "P1", score: 6, weight: 100, weightWithinGroup: 100, status: "graded" as const, date: "2026-09-01", createdAt: 1 }
  const currentNote = { id: "n-current", semesterId: "old-sem", subjectId: "old-sub", title: "Mi apunte", content: "privado", createdAt: 1, updatedAt: 1 }
  const currentAttachment = { id: "a-current", semesterId: "old-sem", subjectId: "old-sub", noteId: "n-current", kind: "pdf" as const, filename: "mio.pdf", mimeType: "application/pdf" as const, sizeBytes: 10, storagePath: "private/a-current", createdAt: 1 }
  const current = {
    ...EMPTY_APP_DATA,
    profile: { displayName: "Persona receptora", institution: "Duoc UC" },
    settings: { ...EMPTY_APP_DATA.settings, theme: "dark" as const, googleCalendarConnected: false, onboarding: { currentStep: 4, completed: true } },
    semesters: [{ id: "old-sem", name: "Semestre anterior", status: "active" as const, createdAt: 1 }],
    activeSemesterId: "old-sem",
    subjects: [{ id: "old-sub", semesterId: "old-sem", name: "Electrotecnia anterior", color: "#111111", commandKey: "ELECTRO", difficulty: 3 as const, createdAt: 1 }],
    studyBlocks: [{ id: "study-current", semesterId: "old-sem", subjectId: "old-sub", title: "Repaso", day: "martes" as const, start: "10:00", end: "10:30" }],
    reminders: [currentReminder],
    assessmentGroups: [currentGroup],
    grades: [currentGrade],
    subjectNotes: [currentNote],
    subjectNoteAttachments: [currentAttachment],
  }

  const result = prepareSharedAcademicImport(imported, current)
  assert.equal(result.profile.displayName, "Persona receptora")
  assert.equal(result.profile.institution, "Duoc UC")
  assert.equal(result.settings.theme, "dark")
  assert.equal(result.settings.googleCalendarConnected, false)
  assert.equal(result.settings.timeFormat, current.settings.timeFormat)
  assert.equal(result.settings.enableSaturday, true)

  const importedSubject = result.subjects.find((subject) => subject.name === "Electrotecnia")
  assert.ok(importedSubject)
  assert.equal(importedSubject?.notes, undefined)
  assert.notEqual(importedSubject?.commandKey, "ELECTRO")
  assert.equal(result.blocks[0]?.subjectId, importedSubject?.id)
  assert.equal(result.activeSemesterId, "s1")
  assert.equal(result.semesters.find((semester) => semester.id === "old-sem")?.status, "archived")

  assert.equal(result.subjects.some((subject) => subject.id === "old-sub"), true)
  assert.deepEqual(result.reminders, [currentReminder])
  assert.deepEqual(result.assessmentGroups, [currentGroup])
  assert.deepEqual(result.grades, [currentGrade])
  assert.deepEqual(result.subjectNotes, [currentNote])
  assert.deepEqual(result.subjectNoteAttachments, [currentAttachment])
  assert.equal(result.reminders.some((reminder) => reminder.id === "r-origin"), false)
  assert.equal(result.subjectNotes.some((note) => note.id === "n-origin"), false)
})

test("validador rechaza adjuntos huérfanos antes de llegar a Supabase", () => {
  const data = {
    ...EMPTY_APP_DATA,
    semesters: [{ id: "s1", name: "Semestre", status: "active" as const, createdAt: 1 }],
    activeSemesterId: "s1",
    subjects: [{ id: "sub1", semesterId: "s1", name: "Materia", color: "#2563eb", commandKey: "materia", difficulty: 3 as const, createdAt: 1 }],
    subjectNoteAttachments: [{ id: "a1", semesterId: "s1", subjectId: "sub1", noteId: "missing", kind: "pdf" as const, filename: "x.pdf", mimeType: "application/pdf" as const, sizeBytes: 10, createdAt: 1 }],
  }
  const result = validateImportedData(data)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(" "), /apunte inexistente/i)
})

test("onboarding confirma el nombre ingresado y no usa un perfil stale en el resumen", async () => {
  const source = await readFile("components/onboarding/onboarding-flow.tsx", "utf8")
  assert.match(source, /await store\.updateProfileConfirmed\(\{ displayName: value \}\)/)
  assert.match(source, /normalizedName \|\| store\.data\.profile\.displayName \|\| "Estudiante"/)
  assert.doesNotMatch(source, /displayGivenName\(store\.data\.profile\.displayName \|\| name\)/)
})

test("Horarily normaliza brazos por encima del cuerpo y CommandDialog reserva la X", async () => {
  const mascot = await readFile("hooks/useHorarily.ts", "utf8")
  const command = await readFile("components/ui/command.tsx", "utf8")
  assert.match(mascot, /body\.after\(leftArm, rightArm\)/)
  assert.match(mascot, /normalizeHorarilyLayerOrder\(target\)/)
  assert.match(command, /command-input-wrapper.*pr-14/)
})

test("full replace elimina dependencias antes de padres", async () => {
  const repository = await readFile("lib/repositories/academic-repository.ts", "utf8")
  const match = repository.match(/REPLACE_DELETE_TABLES = \[([\s\S]*?)\] as const/)
  assert.ok(match)
  const list = match![1]
  assert.ok(list.indexOf('"reminders"') < list.indexOf('"study_blocks"'))
  assert.ok(list.indexOf('"subject_note_attachments"') < list.indexOf('"subject_notes"'))
  assert.ok(list.indexOf('"subject_notes"') < list.indexOf('"subjects"'))
})

test("exportación desde Ajustes usa allData y ofrece modo seguro para compañeros", async () => {
  const source = await readFile("components/settings-view.tsx", "utf8")
  assert.match(source, /exportAsJson\(allData\)/)
  assert.match(source, /importSharedAcademicJson\(raw, allData\)/)
  assert.match(source, /Importar horario y materias/)
  assert.match(source, /accept="\.json,application\/json,text\/json"/)
})
