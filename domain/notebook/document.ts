import type { NoteDocumentV1, NoteTextMark, NoteTextRun, SubjectNote } from "../../lib/types"

export const NOTE_FONT_PRESETS = ["sans", "serif", "mono", "rounded", "clean"] as const

export function legacyTextToDocument(noteId: string, text: string): NoteDocumentV1 {
  return { version: 1, blocks: text.split(/\n{2,}/).map((value, index) => ({ id: `${noteId}-p-${index}`, type: "paragraph", content: [{ text: value }] })) }
}

export function noteDocument(note: Pick<SubjectNote, "id" | "content" | "document">): NoteDocumentV1 {
  return note.document?.version === 1 ? note.document : legacyTextToDocument(note.id || "draft", note.content)
}

export function documentPlainText(document: NoteDocumentV1): string {
  return document.blocks.map((block) => {
    if (block.type === "image" || block.type === "drawing") return block.alt
    if (block.type === "attachmentReference") return block.filename
    if ("items" in block) return block.items.map((item) => item.map((run) => run.text).join("")).join("\n")
    return "content" in block ? block.content.map((run) => run.text).join("") : ""
  }).join("\n\n")
}

export function toggleRunMark(run: NoteTextRun, mark: NoteTextMark): NoteTextRun {
  const marks = new Set(run.marks ?? [])
  if (marks.has(mark)) marks.delete(mark); else marks.add(mark)
  return { ...run, marks: [...marks] }
}
