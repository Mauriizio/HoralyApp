import { mkdir, readdir, writeFile } from "node:fs/promises"

const endpoint = process.argv[2] ?? "http://localhost:9222"
const baseUrl = process.argv[3] ?? "http://localhost:3010"
const pages = await fetch(`${endpoint}/json`).then((response) => response.json())
const page = pages.find((item) => item.type === "page")
if (!page) throw new Error("No browser page target")
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0
const pending = new Map()
socket.onmessage = (event) => { const message = JSON.parse(event.data); if (!Number.isInteger(message.id)) return; const callback = pending.get(message.id); if (typeof callback === "function") callback(message.result); pending.delete(message.id) }
const call = (method, params = {}) => new Promise((resolve) => { const callId = ++id; pending.set(callId, resolve); socket.send(JSON.stringify({ id: callId, method, params })) })
const evaluate = async (expression) => { const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result?.value }
const invoke = async (functionDeclaration, args = []) => { const globalResult = await call("Runtime.evaluate", { expression: "globalThis" }); const result = await call("Runtime.callFunctionOn", { objectId: globalResult.result.objectId, functionDeclaration, arguments: args.map((value) => ({ value })), awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result?.value }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const clickText = async (text) => { const result = await invoke("function(text) { const node = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(text)); if (!node) return false; node.click(); return true }", [text]); assert(result, `No se encontró botón ${text}`); await wait(500) }
const clickLabel = async (label) => { const result = await invoke("function(label) { const node=[...document.querySelectorAll('button[aria-label]')].find((item)=>item.getAttribute('aria-label')===label); if(!node)return false; node.click(); return true }", [label]); assert(result, `No se encontró control ${label}`); await wait(500) }

const semesterId = "qa-semester", subjectId = "qa-subject", noteId = "qa-note"
const tutorialProgress = Object.fromEntries(["basic-tour","schedule-tour","grades-tour","reminders-tour","tools-tour","preferences-tour","assistant-tour","analytics-tour","notebook-tour","advanced-mode-tour"].map((key) => [key, { version: 2, status: "completed", currentStep: 99 }]))
const data = { subjects: [{ id: subjectId, semesterId, name: "SISTEMAS ELECTRONEUMÁTICOS INDUSTRIALES", color: "#7c3aed", icon: "Orbit", difficulty: 3, createdAt: Date.now() }], blocks: [], studyBlocks: [], reminders: [], modules: [], grades: [], assessmentGroups: [], subjectNotes: [{ id: noteId, semesterId, subjectId, title: "QA Rich", unit: "Unidad 1", content: "Texto normal NEGRITA final", document: { version: 1, blocks: [{ id: "p", type: "paragraph", content: [{ text: "Texto normal NEGRITA final" }] }] }, createdAt: Date.now(), updatedAt: Date.now() }], subjectNoteAttachments: [{ id: "orphan", semesterId, subjectId, noteId, kind: "pdf", filename: "legacy-orphan.pdf", mimeType: "application/pdf", sizeBytes: 10, createdAt: Date.now() }], profile: { displayName: "Estudiante QA" }, settings: { theme: "light", language: "es", accentColor: "#7c3aed", fontFamily: "sans", fontScale: 1, timeFormat: "24h", radius: .875, blockOpacity: .9, focusMode: false, enableSaturday: false, visibleScheduleDays: ["lunes","martes","miercoles","jueves"], googleCalendarConnected: false, gradeScale: { min: 1, max: 7, passing: 4 }, onboarding: { currentStep: 0, completed: true }, advancedModeEnabled: false, tutorialProgress }, semesters: [{ id: semesterId, name: "Semestre QA", status: "active", createdAt: Date.now() }], activeSemesterId: semesterId, version: 6 }

await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await call("Page.navigate", { url: baseUrl }); await wait(1200)
await invoke("function(key, value) { localStorage.setItem(key, value) }", ["horario-escolar:v1", JSON.stringify(data)])
await call("Page.navigate", { url: `${baseUrl}/?tab=cuaderno` }); await wait(1800)
await clickText("Abrir cuaderno"); await clickText("QA Rich")
assert(await evaluate(`document.body.innerText.includes('Archivos sin insertar') && document.body.innerText.includes('legacy-orphan.pdf')`), "No se ofreció recuperación del attachment huérfano")
await clickText("Insertar en nota")
assert(await evaluate(`document.querySelector('[data-testid="structured-note-editor"]')?.textContent.includes('legacy-orphan.pdf')`), "No se recuperó el attachment huérfano")

const selectText = async (needle) => {
  const result = await invoke("function(needle) { const root = document.querySelector('[data-block-id=\"p\"]'); if (!root) return false; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const index = node.textContent.indexOf(needle); if (index >= 0) { const range = document.createRange(); range.setStart(node,index); range.setEnd(node,index+needle.length); const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); root.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); return true } } return false }", [needle])
  assert(result, `No se pudo seleccionar ${needle}`)
}
await selectText("NEGRITA"); await clickLabel("Negrita")
assert(await evaluate(`(() => { const root=document.querySelector('[data-block-id="p"]'); const bold=[...root.querySelectorAll('span')].filter((span)=>getComputedStyle(span).fontWeight>=700); return bold.length===1 && bold[0].textContent==='NEGRITA' })()`), "Bold no afectó solo la selección")
await selectText("normal"); await clickLabel("Cursiva")
await selectText("final"); await clickLabel("Subrayado")
await selectText("normal"); await evaluate(`(() => { const select=document.querySelector('select[aria-label="Fuente"]'); select.value='mono'; select.dispatchEvent(new Event('change',{bubbles:true})) })()`); await wait(400)

await evaluate(`(() => { const root=document.querySelector('[data-block-id="p"]'); root.focus(); const range=document.createRange(); range.selectNodeContents(root); range.collapse(false); const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); root.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})) })()`)
await clickLabel("Negrita")
for (const character of " ACTIVO") { await call("Input.dispatchKeyEvent", { type: "keyDown", text: character, key: character }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: character }) } await wait(500)
assert(await evaluate(`[...document.querySelectorAll('[data-block-id="p"] span')].some((span)=>span.textContent?.includes('ACTIVO') && getComputedStyle(span).fontWeight>=700)`), "Texto nuevo no heredó Bold activo")

const upload = async (kind) => {
  const expression = kind === "image"
    ? `(() => { const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),c=>c.charCodeAt(0)); const file=new File([bytes],'pizarra.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(file); const input=document.querySelector('input[accept^="image/"]'); Object.defineProperty(input,'files',{value:dt.files,configurable:true}); input.dispatchEvent(new Event('change',{bubbles:true})) })()`
    : `(() => { const file=new File(['%PDF-1.4\\n%%EOF'],'guia-laboratorio.pdf',{type:'application/pdf'}); const dt=new DataTransfer(); dt.items.add(file); const input=document.querySelector('input[accept="application/pdf"]'); Object.defineProperty(input,'files',{value:dt.files,configurable:true}); input.dispatchEvent(new Event('change',{bubbles:true})) })()`
  await evaluate(expression); await wait(1800)
}
await upload("image")
assert(await evaluate(`document.querySelectorAll('[data-testid="structured-note-editor"] img').length===1`), "Imagen no apareció inline")
await upload("pdf")
assert(await evaluate(`document.querySelector('[data-testid="structured-note-editor"]')?.textContent.includes('guia-laboratorio.pdf')`), "PDF no apareció inline")

await clickText("Dibujar")
await evaluate(`document.querySelector('canvas').scrollIntoView({block:'center'})`); await wait(300)
const rect = await evaluate(`(() => { const r=document.querySelector('canvas').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })()`)
for (let stroke = 0; stroke < 3; stroke++) {
  const x = rect.x + 80, y = rect.y + 70 + stroke * 35
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + 180, y: y + 20, button: "left" })
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + 180, y: y + 20, button: "left" })
}
assert(!(await evaluate(`[...document.querySelectorAll('button')].find((button)=>button.textContent?.includes('Listo'))?.disabled`)), "El canvas no registró los trazos")
await clickText("Listo"); await wait(2000)
assert(await evaluate(`document.querySelectorAll('[data-testid="structured-note-editor"] img').length===2`), "Dibujo no apareció inline")

await wait(1400); await call("Page.reload"); await wait(1800); await clickText("Abrir cuaderno"); await clickText("QA Rich")
const reloadState = await evaluate(`({ bold:[...document.querySelectorAll('[data-block-id="p"] span')].some((span)=>span.textContent==='NEGRITA'&&getComputedStyle(span).fontWeight>=700), images:document.querySelectorAll('[data-testid="structured-note-editor"] img').length, pdf:document.querySelector('[data-testid="structured-note-editor"]')?.textContent.includes('guia-laboratorio.pdf'), orbitText:document.body.innerText.includes('Orbit SISTEMAS') })`)
assert(reloadState.bold && reloadState.images === 2 && reloadState.pdf && !reloadState.orbitText, `Reload incompleto: ${JSON.stringify(reloadState)}`)

await mkdir("docs/qa", { recursive: true })
const downloadDirectory = `docs/qa/hotfix-downloads-${Date.now()}`
await mkdir(downloadDirectory, { recursive: true })
await call("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: `${process.cwd()}\\${downloadDirectory.replaceAll("/", "\\")}` })
assert(await evaluate(`(() => { const button=[...document.querySelectorAll('main button')].find((node)=>node.textContent?.includes('Exportar PDF')); if(!button)return false; button.click(); return true })()`), "No se encontró Exportar PDF de nota")
await wait(1800)
const downloads = await readdir(downloadDirectory)
assert(downloads.some((name) => name.endsWith(".pdf")), "La exportación PDF no descargó un archivo real")
let shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile("docs/qa/hotfix-notebook-rich-1440x900.png", Buffer.from(shot.data, "base64"))
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await wait(500); shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile("docs/qa/hotfix-notebook-rich-390x844.png", Buffer.from(shot.data, "base64"))
assert(await evaluate(`document.documentElement.scrollWidth <= 390`), "Overflow horizontal en mobile")
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
assert(await evaluate(`(() => { const button=document.querySelector('[data-testid="structured-note-editor"] figure button'); if(!button)return false; button.click(); return true })()`), "No se encontró Quitar de imagen")
await wait(1400)
assert(await evaluate(`document.querySelectorAll('[data-testid="structured-note-editor"] img').length===1`), "Eliminar attachment no actualizó el documento")
socket.close()
console.log(JSON.stringify({ pass: true, reloadState }))
