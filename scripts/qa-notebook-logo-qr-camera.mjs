import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const endpoint = process.argv[2] ?? "http://localhost:9223"
const baseUrl = process.argv[3] ?? "http://localhost:3000"
const pages = await fetch(`${endpoint}/json`).then((response) => response.json())
const page = pages.find((item) => item.type === "page"); if (!page) throw new Error("No browser page target")
const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0; const pending = new Map()
socket.onmessage = (event) => { const message = JSON.parse(event.data); if (!Number.isInteger(message.id)) return; pending.get(message.id)?.(message.result); pending.delete(message.id) }
const call = (method, params = {}) => new Promise((resolve) => { const callId = ++id; pending.set(callId, resolve); socket.send(JSON.stringify({ id: callId, method, params })) })
const invoke = async (functionDeclaration, args = []) => { const target = await call("Runtime.evaluate", { expression: "globalThis" }); const result = await call("Runtime.callFunctionOn", { objectId: target.result.objectId, functionDeclaration, arguments: args.map((value) => ({ value })), awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result?.value }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const clickText = async (label) => { assert(await invoke("function(label){const node=[...document.querySelectorAll('button')].find((item)=>item.textContent?.includes(label));if(!node)return false;node.click();return true}", [label]), `No se encontró ${label}`); await wait(250) }
const screenshot = async (file) => { const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(file, Buffer.from(shot.data, "base64")) }

await mkdir("docs/qa", { recursive: true })
const semesterId = "qa-logo-semester", subjectId = "qa-logo-subject", noteId = "qa-logo-note"
const tutorialProgress = Object.fromEntries(["basic-tour","schedule-tour","grades-tour","reminders-tour","tools-tour","preferences-tour","assistant-tour","analytics-tour","notebook-tour","advanced-mode-tour"].map((key) => [key, { version: 2, status: "completed", currentStep: 99 }]))
const now = Date.now()
const data = { subjects: [{ id: subjectId, semesterId, name: "BASES DE ELECTRÓNICA Y PROGRAMACIÓN", color: "#7c3aed", icon: "BookOpen", difficulty: 3, createdAt: now }], blocks: [], studyBlocks: [], reminders: [], modules: [], grades: [], assessmentGroups: [], subjectNotes: [{ id: noteId, semesterId, subjectId, title: "Clase 1 y 2", unit: "EA1", content: "ANTES\nDESPUÉS", document: { version: 1, blocks: [{ id: "before", type: "paragraph", content: [{ text: "ANTES", marks: ["bold"] }] }, { id: "after", type: "paragraph", content: [{ text: "DESPUÉS", marks: ["italic", "underline"] }] }] }, createdAt: now, updatedAt: now }], subjectNoteAttachments: [], profile: { displayName: "Estudiante QA" }, settings: { theme: "light", language: "es", accentColor: "#7c3aed", fontFamily: "sans", fontScale: 1, timeFormat: "24h", radius: .875, blockOpacity: .9, focusMode: false, enableSaturday: false, visibleScheduleDays: ["lunes","martes","miercoles","jueves"], googleCalendarConnected: false, gradeScale: { min: 1, max: 7, passing: 4 }, onboarding: { currentStep: 0, completed: true }, advancedModeEnabled: false, tutorialProgress }, semesters: [{ id: semesterId, name: "Semestre QA", status: "active", createdAt: now }], activeSemesterId: semesterId, version: 6 }

await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await call("Page.navigate", { url: baseUrl }); await wait(900)
await invoke("function(value){localStorage.setItem('horario-escolar:v1',value)}", [JSON.stringify(data)])
await call("Page.navigate", { url: `${baseUrl}/?tab=cuaderno` }); await wait(1600); await clickText("Abrir cuaderno"); await clickText("Clase 1 y 2")
await screenshot("docs/qa/notebook-logo-camera-editor-1440x900.png")

const openMenuAndInspect = async (width, height, file) => {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 }); await wait(200)
  await clickText("Foto")
  const result = await invoke("function(){const menu=document.querySelector('[data-testid=photo-menu]');const rect=menu?.getBoundingClientRect();const toolbar=document.querySelector('[aria-label=\"Formato del apunte\"]');return {visible:Boolean(menu)&&getComputedStyle(menu).visibility!=='hidden',insideToolbar:Boolean(toolbar?.contains(menu)),text:menu?.innerText,rect:rect&&{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},viewport:{width:innerWidth,height:innerHeight}}}")
  assert(result.visible && !result.insideToolbar, `Popover no fue portaleado: ${JSON.stringify(result)}`)
  assert(result.text.includes("Tomar foto") && result.text.includes("Elegir de galería"), "Faltan opciones de Foto")
  assert(result.rect.left >= 0 && result.rect.right <= result.viewport.width && result.rect.top >= 0 && result.rect.bottom <= result.viewport.height, `Popover recortado: ${JSON.stringify(result)}`)
  await screenshot(file); await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" }); await wait(150)
  return result
}
const menus = []
menus.push(await openMenuAndInspect(1440, 900, "docs/qa/notebook-photo-menu-1440x900.png"))
menus.push(await openMenuAndInspect(360, 800, "docs/qa/notebook-photo-menu-360x800.png"))
menus.push(await openMenuAndInspect(390, 844, "docs/qa/notebook-photo-menu-390x844.png"))
menus.push(await openMenuAndInspect(430, 932, "docs/qa/notebook-photo-menu-430x932.png"))

await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(200)
assert(await invoke("function(){const root=document.querySelector('[data-testid=notebook-lite-editor] [contenteditable=true]');const paragraph=root?.querySelector('p');if(!paragraph)return false;const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);const first=walker.nextNode();if(!first)return false;const range=document.createRange();range.setStart(first,first.textContent.length);range.collapse(true);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);root.focus();return true}"), "No se pudo colocar caret antes de la foto")
await invoke("function(){const original=navigator.mediaDevices;const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const context=canvas.getContext('2d');context.fillStyle='#f7f4ff';context.fillRect(0,0,960,540);context.fillStyle='#5b21b6';context.font='bold 64px sans-serif';context.fillText('PIZARRA QA',250,280);document.body.append(canvas);const stream=canvas.captureStream(5);globalThis.__qaCamera={constraints:null,stream,original};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async(constraints)=>{globalThis.__qaCamera.constraints=constraints;return stream}}})}")
await clickText("Foto"); await clickText("Tomar foto"); await wait(1200)
const camera = await invoke("function(){const dialog=document.querySelector('[data-testid=camera-dialog]');const video=document.querySelector('[data-testid=camera-preview]');return {dialog:Boolean(dialog),preview:Boolean(video),constraints:globalThis.__qaCamera?.constraints,ready:![...document.querySelectorAll('button')].find((item)=>item.textContent?.includes('Tomar foto'))?.disabled}}")
assert(camera.dialog && camera.preview, `UI cámara no abrió: ${JSON.stringify(camera)}`)
assert(camera.constraints?.audio === false && camera.constraints?.video?.facingMode?.ideal === "environment", `Constraints incorrectos: ${JSON.stringify(camera)}`)
await screenshot("docs/qa/notebook-camera-mock-390x844.png")
await clickText("Tomar foto"); await wait(2200)
const inline = await invoke("function(){const root=document.querySelector('[data-testid=notebook-lite-editor] [contenteditable=true]');const children=[...root.children];const imageIndex=children.findIndex((child)=>child.querySelector('img'));return {images:root.querySelectorAll('img').length,imageIndex,before:children[0]?.innerText,after:children.at(-1)?.innerText,status:document.body.innerText.includes('Foto insertada'),stopped:globalThis.__qaCamera?.stream.getTracks().every((track)=>track.readyState==='ended')}}")
assert(inline.images === 1 && inline.imageIndex === 1 && inline.status && inline.stopped, `Captura no quedó inline/limpia: ${JSON.stringify(inline)}`)
await screenshot("docs/qa/notebook-camera-inline-390x844.png")
await wait(1700); await call("Page.reload"); await wait(1500); await clickText("Abrir cuaderno"); await clickText("Clase 1 y 2")
const reload = await invoke("function(){const root=document.querySelector('[data-testid=notebook-lite-editor] [contenteditable=true]');return {images:root?.querySelectorAll('img').length,bold:root?.querySelectorAll('strong,.font-bold').length,italic:root?.querySelectorAll('em,.italic').length,underline:root?.querySelectorAll('u,.underline').length,text:root?.innerText}}")
assert(reload.images === 1 && reload.bold > 0 && reload.italic > 0 && reload.underline > 0, `Reload/B-I-U falló: ${JSON.stringify(reload)}`)

await invoke("function(){const input=document.querySelector('[data-testid=gallery-input]');input.click=()=>{globalThis.__qaGalleryClicked=true}}")
await clickText("Foto"); await clickText("Elegir de galería")
assert(await invoke("function(){return globalThis.__qaGalleryClicked===true}"), "La opción Galería no activó su input")
await invoke("async function(){const canvas=document.createElement('canvas');canvas.width=800;canvas.height=480;const context=canvas.getContext('2d');context.fillStyle='#fff7ed';context.fillRect(0,0,800,480);context.fillStyle='#c2410c';context.font='bold 52px sans-serif';context.fillText('GALERÍA QA',220,250);const blob=await new Promise((resolve)=>canvas.toBlob(resolve,'image/jpeg',.88));const transfer=new DataTransfer();transfer.items.add(new File([blob],'galeria-qa.jpg',{type:'image/jpeg'}));const input=document.querySelector('[data-testid=gallery-input]');Object.defineProperty(input,'files',{configurable:true,value:transfer.files});input.dispatchEvent(new Event('change',{bubbles:true}))}")
await wait(1800); assert(await invoke("function(){return document.querySelectorAll('[data-testid=notebook-lite-editor] img').length===2}"), "Galería no insertó la segunda imagen")

await invoke("function(){Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError')}}})}")
await clickText("Foto"); await clickText("Tomar foto"); await wait(500)
assert(await invoke("function(){return document.body.innerText.includes('No pudimos acceder a la cámara.')&&document.body.innerText.includes('Reintentar')&&document.body.innerText.includes('Elegir de galería')}"), "Permiso denegado no mostró recuperación")
await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" }); await wait(150)

await invoke("function(){Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined});const input=document.querySelector('[data-testid=camera-input]');input.click=()=>{globalThis.__qaCaptureFallback=true}}")
await clickText("Foto"); await clickText("Tomar foto")
assert(await invoke("function(){return globalThis.__qaCaptureFallback===true}"), "Navegador sin getUserMedia no activó capture fallback")

await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
const downloadDirectory = path.resolve(`docs/qa/notebook-logo-qr-download-${Date.now()}`); await mkdir(downloadDirectory, { recursive: true })
await call("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDirectory }); await clickText("Exportar PDF"); await wait(1800)
const files = await readdir(downloadDirectory); const pdf = files.find((name) => name.endsWith(".pdf")); assert(pdf, "PDF no fue descargado")
await call("Page.navigate", { url: `file:///${path.join(downloadDirectory, pdf).replaceAll("\\", "/")}` }); await wait(2200)
await screenshot("docs/qa/notebook-pdf-logo-qr-1440x900.png")
socket.close(); console.log(JSON.stringify({ pass: true, menus, camera, inline, reload, pdf: path.join(downloadDirectory, pdf) }))
