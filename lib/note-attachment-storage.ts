import type { SupabaseClient } from "@supabase/supabase-js"
import { attachmentStoragePath, safeAttachmentFilename, validateNoteFile } from "@/domain/notebook/attachments"
import type { SubjectNoteAttachment } from "@/lib/types"

export const NOTE_FILES_BUCKET = "subject-note-files"

export async function uploadCloudNoteAttachment(input: { client: SupabaseClient; file: File; expectedUserId: string; semesterId: string; subjectId: string; noteId: string; kind?: "image" | "pdf" | "drawing"; verifyCurrentUser: () => Promise<string | null> }): Promise<SubjectNoteAttachment> {
  const validation = validateNoteFile(input.file); if (validation) throw new Error(validation)
  if (await input.verifyCurrentUser() !== input.expectedUserId) throw new Error("La sesión cambió. Se canceló la subida.")
  const id = crypto.randomUUID(); const filename = safeAttachmentFilename(input.file.name)
  const storagePath = attachmentStoragePath({ ...input, userId: input.expectedUserId, attachmentId: id, filename })
  const { error: uploadError } = await input.client.storage.from(NOTE_FILES_BUCKET).upload(storagePath, input.file, { upsert: false, contentType: input.file.type })
  if (uploadError) throw uploadError
  try {
    if (await input.verifyCurrentUser() !== input.expectedUserId) throw new Error("La sesión cambió. Se canceló la subida.")
    const attachment: SubjectNoteAttachment = { id, semesterId: input.semesterId, subjectId: input.subjectId, noteId: input.noteId, kind: input.kind ?? (input.file.type === "application/pdf" ? "pdf" : "image"), filename, mimeType: input.file.type as SubjectNoteAttachment["mimeType"], sizeBytes: input.file.size, storagePath, createdAt: Date.now() }
    const { error } = await input.client.from("subject_note_attachments").insert({ id, user_id: input.expectedUserId, semester_id: attachment.semesterId, subject_id: attachment.subjectId, note_id: attachment.noteId, kind: attachment.kind, storage_path: storagePath, filename, mime_type: attachment.mimeType, size_bytes: attachment.sizeBytes })
    if (error) throw error
    if (await input.verifyCurrentUser() !== input.expectedUserId) throw new Error("La sesión cambió. Se canceló la subida.")
    return attachment
  } catch (error) { await input.client.storage.from(NOTE_FILES_BUCKET).remove([storagePath]); throw error }
}

export async function deleteCloudNoteAttachment(client: SupabaseClient, attachment: SubjectNoteAttachment, expectedUserId: string, verifyCurrentUser: () => Promise<string | null>) {
  if (!attachment.storagePath?.startsWith(`${expectedUserId}/`) || await verifyCurrentUser() !== expectedUserId) throw new Error("No se pudo verificar el propietario del archivo.")
  const { error: storageError } = await client.storage.from(NOTE_FILES_BUCKET).remove([attachment.storagePath]); if (storageError) throw storageError
  const { error } = await client.from("subject_note_attachments").delete().eq("id", attachment.id).eq("user_id", expectedUserId); if (error) throw error
  if (await verifyCurrentUser() !== expectedUserId) throw new Error("La sesión cambió durante la eliminación.")
}
