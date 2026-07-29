import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { CalculatorError, evaluateExpression } from "../plugins/scientific-calculator/domain.ts"
import { manifest } from "../plugins/scientific-calculator/manifest.ts"

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`)

test("parser científico respeta precedencia, paréntesis, negativos y decimales", () => {
  assert.equal(evaluateExpression("2+3*4"), 14)
  assert.equal(evaluateExpression("(2+3)*4"), 20)
  assert.equal(evaluateExpression("-2.5+1"), -1.5)
  assert.equal(evaluateExpression("2^3^2"), 512)
  assert.equal(evaluateExpression("sqrt(81)"), 9)
  assert.equal(evaluateExpression("5!"), 120)
  assert.equal(evaluateExpression("50%"), 0.5)
  close(evaluateExpression("pi"), Math.PI)
  close(evaluateExpression("e"), Math.E)
})

test("trigonometría DEG/RAD y logaritmos", () => {
  close(evaluateExpression("sin(30)", "DEG"), 0.5)
  close(evaluateExpression("cos(pi)", "RAD"), -1)
  close(evaluateExpression("tan(45)", "DEG"), 1)
  assert.equal(evaluateExpression("log(100)"), 2)
  assert.equal(evaluateExpression("ln(e)"), 1)
})

test("errores de dominio son comprensibles", () => {
  for (const expression of ["1/0", "sqrt(-1)", "(-1)!", "171!", "(2+3"]) {
    assert.throws(() => evaluateExpression(expression), CalculatorError)
  }
})

test("plugin no usa ejecución arbitraria, red ni permisos personales", async () => {
  const domain = await readFile("plugins/scientific-calculator/domain.ts", "utf8")
  const ui = await readFile("plugins/scientific-calculator/ui.tsx", "utf8")
  assert.doesNotMatch(domain, /\beval\s*\(|new Function|Function\s*\(/)
  assert.doesNotMatch(`${domain}${ui}`, /supabase|fetch\(|cookie|jwt/i)
  assert.deepEqual(manifest.permissions, ["write:own-storage"])
  assert.deepEqual(manifest.capabilities, ["storage:namespace"])
  assert.equal(manifest.category, "Matemáticas")
})
