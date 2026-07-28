import test from "node:test"
import assert from "node:assert/strict"
import {
  APP_TABS,
  NAVIGATION_ITEMS,
  getTabUrl,
  isAppTab,
} from "../components/app-shell/navigation.ts"

test("la navegación conserva parámetros existentes y actualiza tab", () => {
  assert.equal(getTabUrl("notas", "?foo=bar&tab=dashboard"), "?foo=bar&tab=notas")
})

test("todos los destinos visibles corresponden a tabs válidos", () => {
  assert.equal(NAVIGATION_ITEMS.every((item) => isAppTab(item.id)), true)
  assert.equal(APP_TABS.includes("analitica"), true)
  assert.equal(isAppTab("ruta-inexistente"), false)
})

test("la navegación móvil mantiene cuatro accesos directos y Más", () => {
  assert.deepEqual(
    NAVIGATION_ITEMS.filter((item) => item.mobilePrimary).map((item) => item.id),
    ["dashboard", "horario", "materias", "recordatorios"],
  )
})
