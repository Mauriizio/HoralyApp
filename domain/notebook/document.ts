import type { NoteDocumentV1, NoteTextMark, NoteTextRun, SubjectNote } from "../../lib/types"

export const NOTE_FONT_PRESETS = ["sans", "serif", "mono", "rounded", "clean"] as const

export function legacyTextToDocument(noteId: string, text: string): NoteDocumentV1 {
  return { version: 1, blocks: text.split("\n").map((value, index) => ({ id: `${noteId}-p-${index}`, type: "paragraph", content: [{ text: value }] })) }
}

export function noteDocument(note: Pick<SubjectNote, "id" | "content" | "document">): NoteDocumentV1 {
  return note.document?.version === 1 ? note.document : legacyTextToDocument(note.id || "draft", note.content)
}

export function documentPlainText(document: NoteDocumentV1): string {
  return document.blocks.map((block) => {
    if (block.type === "image" || block.type === "drawing" || block.type === "localImage") return block.alt
    if (block.type === "attachmentReference") return block.filename
    if ("items" in block) return block.items.map((item) => item.map((run) => run.text).join("")).join("\n")
    return "content" in block ? block.content.map((run) => run.text).join("") : ""
  }).join("\n")
}

/** Safe, lazy application adapter from rich legacy documents to Cuaderno Lite. */
export function toLiteDocument(document: NoteDocumentV1, fallbackText = ""): NoteDocumentV1 {
  const blocks: NoteDocumentV1["blocks"] = []
  for (const block of document.blocks) {
    if (block.type === "localImage") { blocks.push(block); continue }
    if (block.type === "paragraph" || block.type === "heading") {
      blocks.push({ id: block.id, type: "paragraph", content: block.content.map(liteRun) }); continue
    }
    if (block.type === "bulletList" || block.type === "numberedList") {
      blocks.push(...block.items.map((content, index) => ({ id: `${block.id}-${index}`, type: "paragraph" as const, content: content.map(liteRun) }))); continue
    }
    // Cloud images, drawings and PDFs remain in attachment metadata for read-only recovery.
  }
  if (!blocks.length && fallbackText) return legacyTextToDocument(crypto.randomUUID(), fallbackText)
  return { version: 1, blocks: blocks.length ? blocks : [{ id: crypto.randomUUID(), type: "paragraph", content: [{ text: "" }] }] }
}

function liteRun(run: NoteTextRun): NoteTextRun {
  const marks = run.marks?.filter((mark): mark is NoteTextMark => mark === "bold" || mark === "italic" || mark === "underline")
  return { text: run.text, ...(marks?.length ? { marks } : {}) }
}

export function localImageAssetIds(document: NoteDocumentV1): string[] {
  return document.blocks.flatMap((block) => block.type === "localImage" ? [block.localAssetId] : [])
}

export function toggleRunMark(run: NoteTextRun, mark: NoteTextMark): NoteTextRun {
  const marks = new Set(run.marks ?? [])
  if (marks.has(mark)) marks.delete(mark); else marks.add(mark)
  return { ...run, marks: [...marks] }
}
