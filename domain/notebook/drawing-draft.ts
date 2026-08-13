import type { NoteDocumentV1, SubjectNoteAttachment } from "../../lib/types"
import type { TextSelection } from "./editor"

export interface DrawingDraft { id: string; afterBlockId: string }

export function drawingDraftInsertion(document: NoteDocumentV1, selection: TextSelection | null, id = crypto.randomUUID()): DrawingDraft {
  const selectedExists = selection && document.blocks.some((block) => block.id === selection.blockId)
  return { id, afterBlockId: selectedExists ? selection.blockId : document.blocks.at(-1)?.id ?? "" }
}

export function completeDrawingDraft(document: NoteDocumentV1, draft: DrawingDraft, attachment: Pick<SubjectNoteAttachment, "id" | "kind" | "filename"> | null): NoteDocumentV1 {
  if (!attachment || attachment.kind !== "drawing") throw new Error("Se requiere un attachment confirmado para completar el dibujo.")
  const block = { id: draft.id, type: "drawing" as const, attachmentId: attachment.id, alt: "Dibujo" }
  const blocks = [...document.blocks]
  const index = blocks.findIndex((candidate) => candidate.id === draft.afterBlockId)
  blocks.splice(index >= 0 ? index + 1 : blocks.length, 0, block)
  return { ...document, blocks }
}
