import { createClient } from "@supabase/supabase-js"

const url = process.env.API_URL
const anonKey = process.env.ANON_KEY

if (!url || !anonKey) {
  throw new Error("Supabase local API_URL/ANON_KEY unavailable")
}

const password = "Local-storage-test-2026!"

async function signUp(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signUp({ email, password })
  if (error || !data.session || !data.user) throw error ?? new Error(`No session for ${email}`)
  return {
    id: data.user.id,
    client: createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } }),
  }
}

function expectOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

function expectDenied(result, label) {
  if (!result.error) throw new Error(`${label}: operation unexpectedly succeeded`)
}

const identityA = await signUp("storage-a@example.test")
const identityB = await signUp("storage-b@example.test")
const clientA = identityA.client
const clientB = identityB.client
const pathA = `${identityA.id}/semester-a/subject-a/note-a/attachment-a-test.pdf`
const bucketA = clientA.storage.from("subject-note-files")
const bucketB = clientB.storage.from("subject-note-files")

expectOk(await bucketA.upload(pathA, new Blob(["private-note"], { type: "application/pdf" }), { contentType: "application/pdf" }), "A upload own path")
expectOk(await bucketA.download(pathA), "A download own path")
expectDenied(await bucketB.download(pathA), "B download A")
expectDenied(await bucketB.upload(`${identityA.id}/semester-a/subject-a/note-a/b-attack.pdf`, new Blob(["attack"], { type: "application/pdf" }), { contentType: "application/pdf" }), "B upload A path")
expectDenied(await bucketB.update(pathA, new Blob(["attack"], { type: "application/pdf" }), { contentType: "application/pdf" }), "B update A")
await bucketB.remove([pathA])
expectOk(await bucketA.download(pathA), "A object survives B attacks")

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } })
expectDenied(await anonClient.storage.from("subject-note-files").download(pathA), "anon download")

expectOk(await bucketA.update(pathA, new Blob(["owner-update"], { type: "application/pdf" }), { contentType: "application/pdf" }), "A update own object")
expectOk(await bucketA.remove([pathA]), "A delete own object")
expectDenied(await bucketA.download(pathA), "deleted object unavailable")

console.log("Storage API isolation PASS: A CRUD, B denied, anon denied")
