"use client"

import { useCallback, useEffect, useRef } from "react"
import type { NoteBlock, NoteDocumentV1, NoteTextRun } from "@/lib/types"
import { insertText, type ActiveTextStyle, type TextSelection } from "@/domain/notebook/editor"
import type { DrawingDraft } from "@/domain/notebook/drawing-draft"

const FONT_CLASSES: Record<NonNullable<NoteTextRun["font"]>, string> = {
  sans: "font-sans", serif: "font-serif", mono: "font-mono", rounded: "font-sans tracking-wide", clean: "font-sans",
}

function blockRuns(block: NoteBlock) {
  if (block.type === "paragraph" || block.type === "heading") return block.content
  if (block.type === "bulletList" || block.type === "numberedList") return block.items.flatMap((item, index) => index ? [{ text: "\n" }, ...item] : item)
  return []
}

function selectionOffsets(element: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) return null
  const range = selection.getRangeAt(0)
  const before = range.cloneRange(); before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset)
  const selected = range.cloneRange()
  return { start: before.toString().length, end: before.toString().length + selected.toString().length }
}

function restoreCaret(element: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let remaining = offset, node = walker.nextNode()
  while (node) {
    const length = node.textContent?.length ?? 0
    if (remaining <= length) {
      const range = document.createRange(); range.setStart(node, remaining); range.collapse(true)
      const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range)
      return
    }
    remaining -= length; node = walker.nextNode()
  }
}

function StyledRuns({ runs }: { runs: NoteTextRun[] }) {
  return runs.map((run, index) => (
    <span key={index} className={run.font ? FONT_CLASSES[run.font] : undefined} style={{ fontWeight: run.marks?.includes("bold") ? 700 : undefined, fontStyle: run.marks?.includes("italic") ? "italic" : undefined, textDecoration: run.marks?.includes("underline") ? "underline" : undefined }}>{run.text}</span>
  ))
}

export function StructuredNoteEditor({ document, activeStyle, onChange, onSelection, renderMedia, drawingDraft, renderDrawingDraft }: {
  document: NoteDocumentV1
  activeStyle: ActiveTextStyle
  onChange: (document: NoteDocumentV1) => void
  onSelection: (selection: TextSelection) => void
  renderMedia: (block: Extract<NoteBlock, { attachmentId: string }>) => React.ReactNode
  drawingDraft?: DrawingDraft | null
  renderDrawingDraft?: (draft: DrawingDraft) => React.ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pendingCaret = useRef<{ blockId: string; offset: number } | null>(null)
  const documentRef = useRef(document); documentRef.current = document
  const styleRef = useRef(activeStyle); styleRef.current = activeStyle
  const changeRef = useRef(onChange); changeRef.current = onChange

  useEffect(() => {
    const pending = pendingCaret.current
    if (!pending) return
    pendingCaret.current = null
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(pending.blockId)}"]`)
    if (element) restoreCaret(element, pending.offset)
  }, [document])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const handler = (native: InputEvent) => {
      const element = (native.target as HTMLElement | null)?.closest<HTMLElement>("[data-block-id]")
      if (!element || !root.contains(element)) return
      const offsets = selectionOffsets(element)
      if (!offsets) return
      const blockId = element.dataset.blockId ?? ""
      if ((native.inputType === "insertText" || native.inputType === "insertCompositionText" || native.inputType === "insertParagraph") && (native.data != null || native.inputType === "insertParagraph")) {
        native.preventDefault()
        const value = native.inputType === "insertParagraph" ? "\n" : native.data ?? ""
        pendingCaret.current = { blockId, offset: offsets.start + value.length }
        changeRef.current(insertText(documentRef.current, { blockId, ...offsets }, value, styleRef.current))
      } else if (native.inputType === "deleteContentBackward" && offsets.start > 0) {
        native.preventDefault(); const start = offsets.start === offsets.end ? offsets.start - 1 : offsets.start
        pendingCaret.current = { blockId, offset: start }
        changeRef.current(insertText(documentRef.current, { blockId, start, end: offsets.end }, ""))
      }
    }
    root.addEventListener("beforeinput", handler)
    return () => root.removeEventListener("beforeinput", handler)
  }, [])

  const rememberSelection = useCallback((blockId: string, element: HTMLElement) => {
    const offsets = selectionOffsets(element)
    if (offsets) onSelection({ blockId, ...offsets })
  }, [onSelection])

  return (
    <div ref={rootRef} aria-label="Contenido" className="min-h-[42vh] space-y-3 rounded-md border bg-background p-4" data-testid="structured-note-editor">
      {document.blocks.map((block) => {
        let content: React.ReactNode
        if (block.type === "image" || block.type === "drawing" || block.type === "attachmentReference") content = <div>{renderMedia(block)}</div>
        else {
        const common = { contentEditable: true, suppressContentEditableWarning: true, "data-block-id": block.id, onPaste: (event: React.ClipboardEvent<HTMLElement>) => { const offsets = selectionOffsets(event.currentTarget); if (!offsets) return; event.preventDefault(); const value = event.clipboardData.getData("text/plain"); pendingCaret.current = { blockId: block.id, offset: offsets.start + value.length }; onChange(insertText(document, { blockId: block.id, ...offsets }, value, activeStyle)) }, onMouseUp: (event: React.MouseEvent<HTMLElement>) => rememberSelection(block.id, event.currentTarget), onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => rememberSelection(block.id, event.currentTarget), onFocus: (event: React.FocusEvent<HTMLElement>) => rememberSelection(block.id, event.currentTarget), className: "min-h-7 whitespace-pre-wrap rounded px-1 outline-none focus:ring-2 focus:ring-ring" }
        if (block.type === "heading") content = <h2 {...common} className={`${common.className} text-xl font-semibold`}><StyledRuns runs={block.content} /></h2>
        if (block.type === "bulletList" || block.type === "numberedList") {
          const Tag = block.type === "bulletList" ? "ul" : "ol"
          content = <Tag className={block.type === "bulletList" ? "list-disc pl-6" : "list-decimal pl-6"}>{block.items.map((item, index) => <li key={index} {...common}><StyledRuns runs={item} /></li>)}</Tag>
        } else if (block.type !== "heading") {
          const runs = blockRuns(block)
          content = <p {...common}><StyledRuns runs={runs} />{runs.every((run) => !run.text) ? <br /> : null}</p>
        }
        }
        return <div key={block.id}>{content}{drawingDraft?.afterBlockId === block.id && renderDrawingDraft ? <div data-testid="drawing-draft-block">{renderDrawingDraft(drawingDraft)}</div> : null}</div>
      })}
    </div>
  )
}
