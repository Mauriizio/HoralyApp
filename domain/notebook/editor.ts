import type { NoteBlock, NoteDocumentV1, NoteTextMark, NoteTextRun, SubjectNoteAttachment } from "../../lib/types"

export interface TextSelection { blockId: string; start: number; end: number }
export interface ActiveTextStyle { marks?: NoteTextMark[]; font?: NoteTextRun["font"] }

function runsOf(block: NoteBlock): NoteTextRun[] {
  if (block.type === "paragraph" || block.type === "heading") return block.content
  if (block.type === "bulletList" || block.type === "numberedList") return block.items.flatMap((item, index) => index ? [{ text: "\n" }, ...item] : item)
  return []
}

function sameStyle(a: NoteTextRun, b: NoteTextRun) {
  return a.font === b.font && JSON.stringify(a.marks ?? []) === JSON.stringify(b.marks ?? [])
}

function compact(runs: NoteTextRun[]) {
  return runs.filter((run) => run.text).reduce<NoteTextRun[]>((all, run) => {
    const previous = all.at(-1)
    if (previous && sameStyle(previous, run)) previous.text += run.text
    else {
      const next = { ...run }
      if (!next.marks?.length) delete next.marks
      if (!next.font) delete next.font
      all.push(next)
    }
    return all
  }, [])
}

function mapRange(runs: NoteTextRun[], start: number, end: number, transform: (run: NoteTextRun) => NoteTextRun) {
  let offset = 0
  const next: NoteTextRun[] = []
  for (const run of runs) {
    const runStart = offset, runEnd = offset + run.text.length
    const from = Math.max(start, runStart), to = Math.min(end, runEnd)
    if (runEnd <= start || runStart >= end) next.push({ ...run })
    else {
      if (from > runStart) next.push({ ...run, text: run.text.slice(0, from - runStart) })
      if (to > from) next.push(transform({ ...run, text: run.text.slice(from - runStart, to - runStart) }))
      if (to < runEnd) next.push({ ...run, text: run.text.slice(to - runStart) })
    }
    offset = runEnd
  }
  return compact(next)
}

function replaceBlock(document: NoteDocumentV1, blockId: string, transform: (block: NoteBlock) => NoteBlock): NoteDocumentV1 {
  return { ...document, blocks: document.blocks.map((block) => block.id === blockId ? transform(block) : block) }
}

function withRuns(block: NoteBlock, runs: NoteTextRun[]): NoteBlock {
  if (block.type === "heading") return { ...block, content: runs }
  return { id: block.id, type: "paragraph", content: runs }
}

export function toggleMark(document: NoteDocumentV1, selection: TextSelection, mark: NoteTextMark): NoteDocumentV1 {
  return replaceBlock(document, selection.blockId, (block) => withRuns(block, mapRange(runsOf(block), selection.start, selection.end, (run) => {
    const marks = new Set(run.marks ?? [])
    if (marks.has(mark)) marks.delete(mark); else marks.add(mark)
    return { ...run, marks: [...marks] }
  })))
}

export function applyFont(document: NoteDocumentV1, selection: TextSelection, font: NonNullable<NoteTextRun["font"]>): NoteDocumentV1 {
  return replaceBlock(document, selection.blockId, (block) => withRuns(block, mapRange(runsOf(block), selection.start, selection.end, (run) => ({ ...run, font }))))
}

export function insertText(document: NoteDocumentV1, selection: TextSelection, text: string, style: ActiveTextStyle = {}): NoteDocumentV1 {
  return replaceBlock(document, selection.blockId, (block) => {
    const runs = runsOf(block)
    const before = mapRange(runs, 0, selection.start, (run) => run).filter((_run, index, all) => all.slice(0, index).reduce((sum, item) => sum + item.text.length, 0) < selection.start)
    let consumed = 0
    const beforeTrimmed = before.map((run) => { const value = { ...run, text: run.text.slice(0, Math.max(0, selection.start - consumed)) }; consumed += run.text.length; return value }).filter((run) => run.text)
    consumed = 0
    const after = runs.map((run) => { const start = consumed; consumed += run.text.length; return { ...run, text: run.text.slice(Math.max(0, selection.end - start)) } }).filter((run, index) => run.text && runs.slice(0, index + 1).reduce((sum, item) => sum + item.text.length, 0) > selection.end)
    return withRuns(block, compact([...beforeTrimmed, { text, marks: style.marks, font: style.font }, ...after]))
  })
}

export function applyBlockType(document: NoteDocumentV1, selection: TextSelection, type: "paragraph" | "heading" | "bulletList" | "numberedList"): NoteDocumentV1 {
  return replaceBlock(document, selection.blockId, (block) => {
    const runs = runsOf(block)
    if (type === "heading") return { id: block.id, type, level: 1, content: runs }
    if (type === "bulletList" || type === "numberedList") return { id: block.id, type, items: [runs] }
    return { id: block.id, type, content: runs }
  })
}

export function insertAttachmentBlock(document: NoteDocumentV1, selection: TextSelection | null, attachment: Pick<SubjectNoteAttachment, "id" | "kind" | "filename">): NoteDocumentV1 {
  const type = attachment.kind === "pdf" ? "attachmentReference" : attachment.kind
  const block: NoteBlock = type === "attachmentReference"
    ? { id: `${attachment.id}-block`, type, attachmentId: attachment.id, filename: attachment.filename }
    : { id: `${attachment.id}-block`, type, attachmentId: attachment.id, alt: type === "drawing" ? "Dibujo" : attachment.filename }
  const index = selection ? document.blocks.findIndex((candidate) => candidate.id === selection.blockId) : document.blocks.length - 1
  const blocks = [...document.blocks]
  blocks.splice(Math.max(0, index + 1), 0, block)
  return { ...document, blocks }
}

export function removeAttachmentBlock(document: NoteDocumentV1, attachmentId: string): NoteDocumentV1 {
  return { ...document, blocks: document.blocks.filter((block) => !("attachmentId" in block) || block.attachmentId !== attachmentId) }
}

export function referencedAttachmentIds(document: NoteDocumentV1): Set<string> {
  return new Set(document.blocks.flatMap((block) => "attachmentId" in block ? [block.attachmentId] : []))
}
