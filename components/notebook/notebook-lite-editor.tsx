"use client"

import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState, type ComponentProps, type MutableRefObject, type ReactElement } from "react"
import { $getNodeByKey, $getRoot, $getSelection, $insertNodes, $isParagraphNode, $isRangeSelection, $setSelection, COMMAND_PRIORITY_EDITOR, createCommand, DecoratorNode, FORMAT_TEXT_COMMAND, type EditorConfig, type LexicalCommand, type NodeKey, type RangeSelection, type SerializedLexicalNode, type Spread } from "lexical"
import { $createParagraphNode, $createTextNode, $isTextNode } from "lexical"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { Bold, Camera, ImagePlus, Italic, Trash2, Underline } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { notebookBlobRepository } from "@/lib/notebook-blob-repository"
import type { NoteDocumentV1, NoteTextMark } from "@/lib/types"
import { CameraCaptureDialog } from "./camera-capture-dialog"
import { cameraApiAvailable } from "@/domain/notebook/camera"

type SerializedLocalImageNode = Spread<{ localAssetId: string; alt: string; width?: number; height?: number }, SerializedLexicalNode>
type LocalImagePayload = { localAssetId: string; alt: string; width?: number; height?: number }
const INSERT_LOCAL_IMAGE_COMMAND: LexicalCommand<LocalImagePayload> = createCommand("INSERT_LOCAL_IMAGE")

const ImageActionsContext = createContext<{ onDelete: (assetId: string) => void }>({ onDelete: () => undefined })

function LocalImageView({ nodeKey, assetId, alt }: { nodeKey: NodeKey; assetId: string; alt: string }) {
  const [url, setUrl] = useState("")
  const [missing, setMissing] = useState(false)
  const [editor] = useLexicalComposerContext()
  const { onDelete } = useContext(ImageActionsContext)
  useEffect(() => {
    let active = true, objectUrl = ""
    void notebookBlobRepository.get(assetId).then((blob) => {
      if (!active) return
      if (!blob) { setMissing(true); return }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(() => active && setMissing(true))
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [assetId])
  const remove = () => editor.update(() => { $getNodeByKey(nodeKey)?.remove(); onDelete(assetId) })
  return <figure className="group relative my-3 rounded-xl border bg-muted/20 p-2" contentEditable={false}>
    {missing ? <div className="grid min-h-32 place-items-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Foto disponible en el dispositivo donde fue agregada.</div> : url ? <img src={url} alt={alt} className="mx-auto h-auto max-h-[34rem] max-w-full rounded-lg object-contain" /> : <div className="grid min-h-32 place-items-center text-sm text-muted-foreground">Cargando foto…</div>}
    <Button type="button" variant="secondary" size="sm" className="absolute right-4 top-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" onClick={remove}><Trash2 className="mr-2 size-4" />Eliminar foto</Button>
  </figure>
}

class LocalImageNode extends DecoratorNode<ReactElement> {
  __localAssetId: string; __alt: string; __width?: number; __height?: number
  static getType() { return "local-image" }
  static clone(node: LocalImageNode) { return new LocalImageNode(node.__localAssetId, node.__alt, node.__width, node.__height, node.__key) }
  constructor(localAssetId: string, alt: string, width?: number, height?: number, key?: NodeKey) { super(key); this.__localAssetId = localAssetId; this.__alt = alt; this.__width = width; this.__height = height }
  createDOM(_config: EditorConfig) { return document.createElement("div") }
  updateDOM() { return false }
  isInline() { return false }
  exportJSON(): SerializedLocalImageNode { return { type: "local-image", version: 1, localAssetId: this.__localAssetId, alt: this.__alt, width: this.__width, height: this.__height } }
  static importJSON(value: SerializedLocalImageNode) { return new LocalImageNode(value.localAssetId, value.alt, value.width, value.height) }
  decorate() { return <LocalImageView nodeKey={this.__key} assetId={this.__localAssetId} alt={this.__alt} /> }
}

function $createLocalImageNode(payload: LocalImagePayload) { return new LocalImageNode(payload.localAssetId, payload.alt, payload.width, payload.height) }

function initialize(documentValue: NoteDocumentV1) {
  return () => {
    const root = $getRoot(); root.clear()
    for (const block of documentValue.blocks) {
      if (block.type === "localImage") { root.append($createLocalImageNode(block)); continue }
      if (block.type !== "paragraph") continue
      const paragraph = $createParagraphNode()
      for (const run of block.content) {
        const text = $createTextNode(run.text)
        for (const mark of run.marks ?? []) text.toggleFormat(mark)
        paragraph.append(text)
      }
      root.append(paragraph)
    }
    if (!root.getFirstChild()) root.append($createParagraphNode())
  }
}

function editorDocument(): NoteDocumentV1 {
  const blocks: NoteDocumentV1["blocks"] = []
  for (const node of $getRoot().getChildren()) {
    if (node instanceof LocalImageNode) {
      blocks.push({ id: node.getKey(), type: "localImage", localAssetId: node.__localAssetId, alt: node.__alt, width: node.__width, height: node.__height })
    } else if ($isParagraphNode(node)) {
      const content = node.getChildren().filter($isTextNode).map((text) => {
        const marks = (["bold", "italic", "underline"] as NoteTextMark[]).filter((mark) => text.hasFormat(mark))
        return { text: text.getTextContent(), ...(marks.length ? { marks } : {}) }
      })
      blocks.push({ id: node.getKey(), type: "paragraph", content: content.length ? content : [{ text: "" }] })
    }
  }
  return { version: 1, blocks }
}

function Toolbar({ onPhoto, bookmark }: { onPhoto: (file: File) => void; bookmark: MutableRefObject<RangeSelection | null> }) {
  const [editor] = useLexicalComposerContext()
  const [active, setActive] = useState<Record<NoteTextMark, boolean>>({ bold: false, italic: false, underline: false })
  const [photoOpen, setPhotoOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const saveBookmark = () => editor.getEditorState().read(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) bookmark.current = selection.clone()
  })
  const chooseGallery = () => {
    saveBookmark(); setPhotoOpen(false)
    galleryInput.current?.click()
  }
  const chooseCamera = () => {
    saveBookmark(); setPhotoOpen(false)
    if (cameraApiAvailable()) setCameraOpen(true)
    else cameraInput.current?.click()
  }
  useEffect(() => editor.registerUpdateListener(({ editorState }) => editorState.read(() => {
    const selection = $getSelection()
    setActive({ bold: $isRangeSelection(selection) && selection.hasFormat("bold"), italic: $isRangeSelection(selection) && selection.hasFormat("italic"), underline: $isRangeSelection(selection) && selection.hasFormat("underline") })
  })), [editor])
  return <div className="sticky top-0 z-10 flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border bg-background/95 p-1.5 backdrop-blur" aria-label="Formato del apunte">
    {([ ["bold", "Negrita", Bold], ["italic", "Cursiva", Italic], ["underline", "Subrayado", Underline] ] as const).map(([mark, label, Icon]) => <Button key={mark} type="button" size="icon" className="min-h-11 min-w-11" variant={active[mark] ? "secondary" : "ghost"} aria-label={label} aria-pressed={active[mark]} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, mark)}><Icon className="size-4" /></Button>)}
    <Popover open={photoOpen} onOpenChange={(open) => { if (open) saveBookmark(); setPhotoOpen(open) }}>
      <PopoverTrigger asChild><Button type="button" variant="ghost" className="min-h-11 gap-2 px-3"><ImagePlus className="size-4" />Foto</Button></PopoverTrigger>
      <PopoverContent side="bottom" align="start" collisionPadding={12} className="z-50 w-56 space-y-1 p-2" data-testid="photo-menu">
        <Button type="button" variant="ghost" className="min-h-11 w-full justify-start gap-2" onClick={chooseCamera}><Camera className="size-4" />Tomar foto</Button>
        <Button type="button" variant="ghost" className="min-h-11 w-full justify-start gap-2" onClick={chooseGallery}><ImagePlus className="size-4" />Elegir de galería</Button>
      </PopoverContent>
    </Popover>
    <input ref={cameraInput} data-testid="camera-input" className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhoto(file); event.currentTarget.value = "" }} />
    <input ref={galleryInput} data-testid="gallery-input" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhoto(file); event.currentTarget.value = "" }} />
    <CameraCaptureDialog open={cameraOpen} onOpenChange={setCameraOpen} onPhoto={onPhoto} onGalleryFallback={chooseGallery} />
  </div>
}

function Commands({ api, bookmark }: { api: MutableRefObject<NotebookLiteEditorHandle | null>; bookmark: MutableRefObject<RangeSelection | null> }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => editor.registerCommand(INSERT_LOCAL_IMAGE_COMMAND, (payload) => {
    if (bookmark.current) { $setSelection(bookmark.current.clone()); bookmark.current = null }
    const selection = $getSelection()
    if ($isRangeSelection(selection) && !selection.isCollapsed()) selection.anchor.set(selection.focus.key, selection.focus.offset, selection.focus.type)
    const image = $createLocalImageNode(payload); $insertNodes([image]); const paragraph = $createParagraphNode(); image.insertAfter(paragraph); paragraph.select(); return true
  }, COMMAND_PRIORITY_EDITOR), [editor])
  useEffect(() => { api.current = { insertLocalImage: (payload) => editor.dispatchCommand(INSERT_LOCAL_IMAGE_COMMAND, payload), focus: () => editor.focus() }; return () => { api.current = null } }, [api, editor])
  return null
}

export interface NotebookLiteEditorHandle { insertLocalImage(payload: LocalImagePayload): boolean; focus(): void }

export const NotebookLiteEditor = forwardRef<NotebookLiteEditorHandle, { document: NoteDocumentV1; onChange: (document: NoteDocumentV1) => void; onPhoto: (file: File) => void; onLocalImageRemoved: (assetId: string) => void }>(function NotebookLiteEditor({ document, onChange, onPhoto, onLocalImageRemoved }, forwardedRef) {
  const [api] = useState(() => ({ current: null as NotebookLiteEditorHandle | null }))
  const bookmark = useRef<RangeSelection | null>(null)
  useImperativeHandle(forwardedRef, () => ({ insertLocalImage: (payload) => api.current?.insertLocalImage(payload) ?? false, focus: () => api.current?.focus() }))
  const handleChange = useCallback((state: Parameters<NonNullable<ComponentProps<typeof OnChangePlugin>["onChange"]>>[0]) => state.read(() => onChange(editorDocument())), [onChange])
  return <LexicalComposer initialConfig={{ namespace: "HorarilyNotebookLite", nodes: [LocalImageNode], editorState: initialize(document), onError: (error) => { throw error }, theme: { text: { bold: "font-bold", italic: "italic", underline: "underline" }, paragraph: "min-h-7 mb-2" } }}>
    <ImageActionsContext.Provider value={{ onDelete: onLocalImageRemoved }}>
      <Toolbar onPhoto={onPhoto} bookmark={bookmark} />
      <div data-testid="notebook-lite-editor" className="relative mt-3 min-h-[42vh] rounded-md border bg-background p-4 text-base leading-7 focus-within:ring-2 focus-within:ring-ring">
        <RichTextPlugin contentEditable={<ContentEditable aria-label="Contenido" className="min-h-[38vh] outline-none" />} placeholder={<div className="pointer-events-none absolute left-4 top-4 text-muted-foreground">Escribe aquí tus apuntes…</div>} ErrorBoundary={LexicalErrorBoundary} />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <Commands api={api} bookmark={bookmark} />
      </div>
    </ImageActionsContext.Provider>
  </LexicalComposer>
})
