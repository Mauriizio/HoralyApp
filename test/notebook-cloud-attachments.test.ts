import assert from "node:assert/strict"
import test from "node:test"
import { uploadCloudNoteAttachment } from "../lib/note-attachment-storage.ts"

test("upload cloud compensa Storage si metadata falla", async () => {
  const calls: string[] = []
  const client = { storage: { from: () => ({ upload: async () => { calls.push("upload"); return { error: null } }, remove: async () => { calls.push("remove"); return { error: null } } }) }, from: () => ({ insert: async () => { calls.push("metadata"); return { error: new Error("metadata") } } }) } as never
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" })
  await assert.rejects(uploadCloudNoteAttachment({ client, file, expectedUserId: "user-a", semesterId: "sem-1", subjectId: "sub-1", noteId: "note-1", verifyCurrentUser: async () => "user-a" }))
  assert.deepEqual(calls, ["upload", "metadata", "remove"])
})

test("upload cloud aborta y compensa si la identidad cambia A a B", async () => {
  const calls: string[] = []; let verification = 0
  const client = { storage: { from: () => ({ upload: async () => { calls.push("upload"); return { error: null } }, remove: async () => { calls.push("remove"); return { error: null } } }) }, from: () => ({ insert: async () => ({ error: null }) }) } as never
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" })
  await assert.rejects(uploadCloudNoteAttachment({ client, file, expectedUserId: "user-a", semesterId: "sem-1", subjectId: "sub-1", noteId: "note-1", verifyCurrentUser: async () => ++verification === 1 ? "user-a" : "user-b" }), /sesión cambió/i)
  assert.deepEqual(calls, ["upload", "remove"])
})
