import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { SessionIdentityMismatchError, shortIdentity } from "../lib/session-identity.ts"
import { SupabaseAcademicRepository } from "../lib/repositories/academic-repository.ts"

test("regresión A/B: la barrera de identidad está presente en Auth, Store, Repository, UI y Storage", async () => {
  const auth = await readFile("lib/auth-context.tsx", "utf8")
  const store = await readFile("hooks/use-schedule-store.ts", "utf8")
  const form = await readFile("components/profile-form.tsx", "utf8")
  const app = await readFile("app/page.tsx", "utf8")

  assert.match(auth, /userId: session\?\.user\?\.id \?\? null/)
  assert.match(auth, /authGeneration/)
  assert.match(auth, /transitioning/)
  assert.match(auth, /verifyCurrentUser/)
  assert.match(auth, /supabase\.auth\.getUser\(\)/)
  assert.match(store, /dataOwnerUserId/)
  assert.match(store, /repositoryOwnerUserId/)
  assert.match(store, /identityReady/)
  assert.match(store, /persistCloud\(expectedUserId/)
  assert.match(store, /assertCloudIdentity/)
  assert.match(store, /stale_load_discarded/)
  assert.match(form, /operationUserId/)
  assert.match(form, /operationAuthGeneration/)
  assert.match(form, /verifyCurrentUser\(\)/)
  assert.match(form, /uploadAvatar\(supabase, operationUserId, pendingFile\)/)
  assert.match(form, /cleanupAvatar\(supabase, operationUserId, uploaded\.path\)/)
  assert.match(app, /key=\{userId \?\? "guest"\}/)
  assert.match(app, /Cambiando de cuenta…/)
})

test("AuthProvider sale de transición de forma segura si falla la sesión inicial", async () => {
  const source = await readFile("lib/auth-context.tsx", "utf8")
  assert.match(source, /getSession\(\)[\s\S]*?\.catch\([\s\S]*?applySession\(null,\s*"INITIAL_SESSION_ERROR"\)/)
})

test("repositoryOwner=A y expected=B rechaza operaciones cloud", () => {
  const repo = new SupabaseAcademicRepository({} as never, "user-a")
  assert.throws(() => repo.assertRepositoryOwner("user-b"), SessionIdentityMismatchError)
  assert.doesNotThrow(() => repo.assertRepositoryOwner("user-a"))
})

test("diagnóstico de identidad abrevia IDs y no filtra identificadores completos", () => {
  assert.equal(shortIdentity("abcd-1234-efgh-5678"), "abcd…5678")
  assert.equal(shortIdentity(null), null)
})

test("ProfileForm bloquea transición y no abre/guarda sin identityReady", async () => {
  const form = await readFile("components/profile-form.tsx", "utf8")
  const button = await readFile("components/profile-button.tsx", "utf8")
  assert.match(form, /saving \|\| transitioning \|\| !store\.identityReady/)
  assert.match(form, /open=\{open && !transitioning && store\.identityReady\}/)
  assert.match(button, /if \(loading \|\| !authenticated\) return null/)
  assert.match(button, /if \(transitioning \|\| !store\.identityReady\) return null/)
})

test("service worker no se registra en development y limpia solo caches Horaly", async () => {
  const register = await readFile("components/pwa-register.tsx", "utf8")
  const sw = await readFile("public/sw.js", "utf8")
  assert.match(register, /process\.env\.NODE_ENV !== "production"/)
  assert.match(register, /cleanupDevelopmentWorkers/)
  assert.match(register, /key\.startsWith\(HORALY_CACHE_PREFIX\)/)
  assert.match(sw, /horaly-shell-v4/)
  assert.match(sw, /isSupabaseRequest/)
  assert.match(sw, /isAvatarRequest/)
  assert.match(sw, /!isSameOrigin/)
})

test("no se introducen secretos ni cambios destructivos en avatar", async () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  assert.equal(/SERVICE_ROLE|SUPABASE_DB_PASSWORD|postgres:\/\//.test(tracked), false)
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
  assert.equal(/lib\/avatar-storage|components\/profile-form/m.test(changed), false)
  assert.equal(/supabase\/migrations\/(202607180001|202607200001|202607200002|202607200003)/m.test(changed), false)
})

test("versionado inmutable de avatar se conserva y no crea rutas legacy nuevas", async () => {
  const avatar = await readFile("lib/avatar-storage.ts", "utf8")
  assert.match(avatar, /\$\{userId\}\/avatars\/\$\{avatarVersionId\(\)\}/)
  assert.match(avatar, /upsert: false/)
  assert.doesNotMatch(avatar, /return `\$\{userId\}\/avatar\./)
})
