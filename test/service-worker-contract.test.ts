import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("service worker excluye tráfico privado, callbacks y feedback de Preview", async () => {
  const source = await readFile("public/sw.js", "utf8")
  assert.match(source, /request\.method !== "GET"/)
  assert.match(source, /url\.protocol !== "http:"/)
  assert.match(source, /url\.protocol !== "https:"/)
  assert.match(source, /\/auth\/callback/)
  assert.match(source, /vercel\.live/)
  assert.match(source, /\/realtime\/v1\//)
  assert.match(source, /response\.ok/)
})

test("toda promesa entregada a respondWith tiene fallback que no rechaza", async () => {
  const source = await readFile("public/sw.js", "utf8")
  assert.match(source, /safeFetch/)
  assert.doesNotMatch(source, /cached \|\| fetch\(req\)/)
})

test("chunks versionados de Next usan red primero para no congelar bundles PWA", async () => {
  const source = await readFile("public/sw.js", "utf8")
  assert.match(source, /function isNextStaticAsset/)
  assert.match(source, /if \(isNextStaticAsset\(url\)\) \{\s*event\.respondWith\(networkFirstAndCache\(request\)\)/)
  assert.ok(source.indexOf("if (isNextStaticAsset(url))") < source.lastIndexOf("caches.match(request)"))
})
