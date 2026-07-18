import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { findScheduleBlockConflicts } from "../lib/schedule-conflicts.ts"

describe("conflictos de bloques", () => {
  it("detecta bloques en el mismo día y módulo", () => {
    const conflicts = findScheduleBlockConflicts(
      { id: "nuevo", subjectId: "fis", day: "lunes", moduleIds: ["m1"] },
      [{ id: "actual", subjectId: "mat", day: "lunes", moduleIds: ["m1", "m2"] }],
    )
    assert.deepEqual(conflicts.map((block) => block.id), ["actual"])
  })

  it("ignora otros días y el mismo bloque", () => {
    const conflicts = findScheduleBlockConflicts(
      { id: "actual", subjectId: "fis", day: "lunes", moduleIds: ["m1"] },
      [
        { id: "actual", subjectId: "fis", day: "lunes", moduleIds: ["m1"] },
        { id: "otro", subjectId: "mat", day: "martes", moduleIds: ["m1"] },
      ],
    )
    assert.deepEqual(conflicts, [])
  })
})
