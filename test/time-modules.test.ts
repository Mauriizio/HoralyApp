import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { validateModules } from "../lib/time-modules.ts"

describe("validateModules", () => {
  it("acepta módulos ordenables y sin solapamiento", () => {
    assert.deepEqual(validateModules([
      { id: "m2", start: "09:00", end: "10:00", label: "M2" },
      { id: "m1", start: "08:00", end: "08:45", label: "M1" },
    ]), null)
  })

  it("rechaza rangos horarios inválidos", () => {
    assert.deepEqual(validateModules([{ id: "m1", start: "10:00", end: "09:00", label: "M1" }]), "range")
  })

  it("rechaza módulos solapados", () => {
    assert.deepEqual(validateModules([
      { id: "m1", start: "08:00", end: "09:00", label: "M1" },
      { id: "m2", start: "08:30", end: "09:30", label: "M2" },
    ]), "overlap")
  })
})
