import type { NoteBlock, NoteDocumentV1 } from "../../lib/types"

export const NOTE_IMAGE_LIMITS = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxInputBytes: 20 * 1024 * 1024,
  maxLongEdge: 2200,
  jpegQuality: 0.84,
} as const

export function validateLocalImage(file: Pick<File, "type" | "size">): string | null {
  if (!(NOTE_IMAGE_LIMITS.acceptedMimeTypes as readonly string[]).includes(file.type)) return "Solo puedes agregar fotos JPEG, PNG o WebP."
  if (file.size > NOTE_IMAGE_LIMITS.maxInputBytes) return "La foto supera el límite de 20 MB."
  return null
}

export function localImageBlock(localAssetId: string, dimensions?: { width: number; height: number }): Extract<NoteBlock, { type: "localImage" }> {
  return { id: crypto.randomUUID(), type: "localImage", localAssetId, alt: "Foto del apunte", ...dimensions }
}

export function insertLocalImageAfter(document: NoteDocumentV1, blockId: string, image: Extract<NoteBlock, { type: "localImage" }>): NoteDocumentV1 {
  const index = document.blocks.findIndex((block) => block.id === blockId)
  const paragraph = { id: crypto.randomUUID(), type: "paragraph" as const, content: [{ text: "" }] }
  const blocks = [...document.blocks]
  blocks.splice(index < 0 ? blocks.length : index + 1, 0, image, paragraph)
  return { version: 1, blocks }
}

export async function processLocalImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const issue = validateLocalImage(file)
  if (issue) throw new Error(issue)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, NOTE_IMAGE_LIMITS.maxLongEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height
  const context = canvas.getContext("2d"); if (!context) { bitmap.close(); throw new Error("No se pudo procesar la foto.") }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close()
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo procesar la foto.")), outputType, NOTE_IMAGE_LIMITS.jpegQuality))
  return { blob, width, height }
}
