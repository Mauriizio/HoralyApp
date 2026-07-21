import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { win32, posix } from "node:path"

const pdfSource = readFileSync("domain/schedule-pdf/index.ts", "utf8")
const toolSource = readFileSync("scripts/create-tool.mjs", "utf8")

test("jsPDF usa entrypoint público sin shim profundo", async () => {
  assert.match(pdfSource, /import\("jspdf"\)/)
  assert.doesNotMatch(pdfSource, /jspdf\/dist\//)
  assert.equal(existsSync("types/jspdf-browser.d.ts"), false)
  const mod = await import("jspdf")
  assert.equal(Boolean(mod.jsPDF), true)
})

test("validación de generador es portable Windows/Linux", async () => {
  const { isSafePluginTarget } = await import("../scripts/create-tool.mjs")
  assert.equal(isSafePluginTarget(win32, "C:\\repo\\plugins", "C:\\repo\\plugins\\temporal-qa-tool"), true)
  assert.equal(isSafePluginTarget(posix, "/repo/plugins", "/repo/plugins/temporal-qa-tool"), true)
  assert.equal(isSafePluginTarget(win32, "C:\\repo\\plugins", "C:\\repo\\malo"), false)
  assert.equal(isSafePluginTarget(posix, "/repo/plugins", "/repo/malo"), false)
  assert.equal(isSafePluginTarget(win32, "C:\\repo\\plugins", "D:\\otro\\tool"), false)
  assert.doesNotMatch(toolSource, /startsWith\(`\$\{pluginsDir\}\//)
})
