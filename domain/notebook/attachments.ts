export const NOTE_FILE_LIMITS = { imageBytes: 8 * 1024 * 1024, pdfBytes: 15 * 1024 * 1024 } as const
export const NOTE_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const
export type NoteAllowedMime = (typeof NOTE_ALLOWED_MIME)[number]
export interface NoteAttachment { id: string; semesterId: string; subjectId: string; noteId: string; kind: "image" | "pdf" | "drawing"; filename: string; mimeType: NoteAllowedMime; sizeBytes: number; storagePath?: string; createdAt: number }

export function safeAttachmentFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "archivo"
  return base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(0, 100) || "archivo"
}

export function validateNoteFile(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!NOTE_ALLOWED_MIME.includes(file.type as NoteAllowedMime)) return "Tipo de archivo no permitido. Usa JPEG, PNG, WebP o PDF."
  const safe = safeAttachmentFilename(file.name).toLowerCase()
  const extensions: Record<NoteAllowedMime, string[]> = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "application/pdf": [".pdf"] }
  if (!extensions[file.type as NoteAllowedMime].some((extension) => safe.endsWith(extension))) return "La extensión no coincide con el tipo real del archivo."
  const limit = file.type === "application/pdf" ? NOTE_FILE_LIMITS.pdfBytes : NOTE_FILE_LIMITS.imageBytes
  return file.size > limit ? `El archivo supera el límite de ${Math.round(limit / 1024 / 1024)} MB.` : null
}

export function attachmentStoragePath(input: { userId: string; semesterId: string; subjectId: string; noteId: string; attachmentId: string; filename: string }): string {
  for (const value of [input.userId, input.semesterId, input.subjectId, input.noteId, input.attachmentId]) if (!/^[a-zA-Z0-9-]+$/.test(value)) throw new Error("Identificador de archivo no válido.")
  return `${input.userId}/${input.semesterId}/${input.subjectId}/${input.noteId}/${input.attachmentId}-${safeAttachmentFilename(input.filename)}`
}
