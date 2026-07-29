import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import { createPluginRegistry, TOOL_CATEGORIES } from "../lib/plugins/plugin-registry.ts"
import { toolPlugins } from "../plugins/index.ts"
import { permissionsAllowedByCapabilities } from "../lib/plugins/plugin-capabilities.ts"
import { bandsToValue, valueToBands } from "../plugins/resistor-color-code/domain.ts"

test("auth de invitado usa una única fuente pública sin avatar ni menú", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  const actions = await readFile("components/auth/guest-auth-actions.tsx", "utf8")
  assert.match(page, /<GuestAuthActions/)
  assert.match(actions, /Iniciar sesión/)
  assert.match(actions, /Crear cuenta/)
  assert.equal(/Avatar|Popover|DropdownMenu/.test(actions), false)
  assert.match(actions, /Cargando sesión/)
})

test("pantallas auth tienen salida accesible y registro confirma contraseña", async () => {
  const form = await readFile("components/auth-form.tsx", "utf8")
  const update = await readFile("app/auth/update-password/page.tsx", "utf8")
  const status = await readFile("app/auth/status/page.tsx", "utf8")
  assert.match(form, /aria-label="Volver a Horaly"/)
  assert.match(update, /aria-label="Volver a Horaly"/)
  assert.match(status, /Volver a Horaly/)
  assert.match(form, /confirmPassword/)
  assert.match(form, /Las contraseñas no coinciden/)
  assert.match(form, /if \(loading\) return/)
})

test("Google OAuth queda tras feature flag sin secretos", async () => {
  const form = await readFile("components/auth-form.tsx", "utf8")
  assert.match(form, /NEXT_PUBLIC_GOOGLE_AUTH_ENABLED/)
  assert.match(form, /signInWithOAuth\(\{[\s\S]*provider: "google"/)
  assert.match(form, /redirectTo: getPublicAuthCallbackUrl/)
  assert.equal(/CLIENT_SECRET|GOOGLE_SECRET|service_role/i.test(form), false)
})

test("catálogo de herramientas registra categorías, filtros y plugin real aislado", async () => {
  assert.deepEqual(TOOL_CATEGORIES, ["Electricidad", "Electrónica", "Automatización", "Matemáticas", "Utilidades"])
  const registry = createPluginRegistry(toolPlugins)
  const manifest = registry.get("resistor-color-code")
  assert.equal(manifest?.status, "available")
  assert.equal(manifest ? permissionsAllowedByCapabilities(manifest.capabilities, manifest.permissions) : false, true)
  const view = await readFile("components/tools/plugins-view.tsx", "utf8")
  assert.match(view, /Buscar herramienta/)
  assert.match(view, /ErrorBoundary/)
  assert.match(view, /Volver al catálogo/)
})

test("plugin de resistencias calcula 4, 5 y 6 bandas en ambos sentidos", () => {
  const four = bandsToValue({ bandCount: 4, colors: ["marrón", "negro", "rojo", "oro"] })
  assert.equal(four.nominalOhms, 1000)
  assert.equal(four.tolerancePercent, 5)
  assert.equal(four.minimumOhms, 950)
  assert.equal(four.maximumOhms, 1050)

  const five = bandsToValue({ bandCount: 5, colors: ["marrón", "negro", "negro", "naranja", "marrón"] })
  assert.equal(five.nominalOhms, 100000)
  assert.equal(five.tolerancePercent, 1)

  const six = bandsToValue({ bandCount: 6, colors: ["marrón", "negro", "negro", "rojo", "marrón", "rojo"] })
  assert.equal(six.nominalOhms, 10000)
  assert.equal(six.temperatureCoefficientPpm, 50)

  const inverse = valueToBands({ ohms: 4700, bandCount: 4, tolerancePercent: 5 })
  assert.deepEqual(inverse.colors, ["amarillo", "violeta", "rojo", "oro"])
  assert.equal(inverse.exact, true)
})

test("resistencias rechaza entradas numéricas y combinaciones inválidas", () => {
  assert.throws(() => valueToBands({ ohms: Number.NaN, bandCount: 4, tolerancePercent: 5 }), /valor válido/)
  assert.throws(() => valueToBands({ ohms: -1, bandCount: 4, tolerancePercent: 5 }), /valor válido/)
  assert.throws(() => bandsToValue({ bandCount: 4, colors: ["oro", "negro", "rojo", "oro"] }), /inválido/)
})
