import test from "node:test"
import assert from "node:assert/strict"
import {
  DeterministicConversationAdapter,
  type AssistantIntent,
} from "../application/conversation-understanding.ts"

const adapter = new DeterministicConversationAdapter()
const capabilities: AssistantIntent[] = [
  "createSubject", "listSubjects", "editSubject", "nextClass", "todaySchedule", "openSchedule",
  "showGrades", "showAverage", "showSubjectAverage", "createReminder", "listReminders",
  "openTools", "openPreferences", "help", "confirm", "reject", "correct", "cancel", "unknown",
]
const visibleSubjects = [{ id: "fis", name: "Física" }, { id: "mat", name: "Matemáticas" }, { id: "dib", name: "Dibujo de Planos" }]

function understand(message: string) {
  return adapter.understand({ message, state: { kind: "idle" }, availableCapabilities: capabilities, visibleSubjects })
}

test("corpus determinista cubre al menos 120 expresiones españolas con confianza", () => {
  const corpus: Array<[AssistantIntent, string]> = []
  const groups: Array<[AssistantIntent, string[]]> = [
    ["createSubject", ["agregar materia", "crear materia", "nueva materia"]],
    ["listSubjects", ["ver materias", "mis materias", "listar materias"]],
    ["nextClass", ["próxima clase", "que clase sigue", "clase tengo ahora"]],
    ["todaySchedule", ["horario de hoy", "clases de hoy", "que tengo hoy"]],
    ["openSchedule", ["abrir horario", "ver horario", "configurar horario"]],
    ["showGrades", ["ver mis notas", "mis notas", "que nota llevo"]],
    ["showAverage", ["ver mi promedio", "cuál es mi promedio", "promedio general"]],
    ["createReminder", ["crear recordatorio", "nuevo recordatorio", "agregar recordatorio"]],
    ["listReminders", ["ver recordatorios", "mis recordatorios", "listar recordatorios"]],
    ["openTools", ["abrir herramientas", "ver herramientas"]],
    ["openPreferences", ["abrir preferencias", "ver preferencias", "configuración"]],
    ["help", ["ayuda", "qué puedes hacer", "abrir ayuda"]],
  ]
  const wrappers = ["{}", "Por favor, {}", "Oye Horarily, {}", "¿{}?", "Necesito {}"]
  for (const [intent, phrases] of groups) {
    for (const phrase of phrases) for (const wrapper of wrappers) corpus.push([intent, wrapper.replace("{}", phrase)])
  }
  assert.ok(corpus.length >= 120)
  for (const [expected, expression] of corpus) {
    const result = understand(expression)
    assert.equal(result.intent, expected, expression)
    assert.ok(result.confidence >= 0.58, expression)
  }
})

test("tolera errores leves y extrae promedios de materias reales", () => {
  assert.equal(understand("quiero ver mi promeido").intent, "showAverage")
  assert.equal(understand("abrir orario").intent, "openSchedule")
  assert.equal(understand("crear recoradatorio").intent, "createReminder")
  for (const phrase of ["promedio de Matemáticas", "cómo voy en Fisca", "notas de Dibujo de Planos"]) {
    assert.equal(understand(phrase).intent, "showSubjectAverage", phrase)
  }
})

test("entradas ambiguas o desconocidas no ejecutan acciones", () => {
  for (const phrase of ["haz eso", "materia", "promedio", "hola mundo", "borra todo", "abre https://evil.example"]) {
    const result = understand(phrase)
    assert.equal(result.intent, "unknown", phrase)
    assert.equal(result.needsClarification, true, phrase)
  }
})
