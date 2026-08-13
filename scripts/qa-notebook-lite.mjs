import { mkdir, readdir, writeFile } from "node:fs/promises"

const endpoint = process.argv[2] ?? "http://localhost:9223"
const baseUrl = process.argv[3] ?? "http://localhost:3000"
const pages = await fetch(`${endpoint}/json`).then((response) => response.json())
const page = pages.find((item) => item.type === "page"); if (!page) throw new Error("No browser page target")
const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0; const pending = new Map()
socket.onmessage = (event) => { const message = JSON.parse(event.data); if (!Number.isInteger(message.id)) return; const callback = pending.get(message.id); if (typeof callback === "function") callback(message.result); pending.delete(message.id) }
const call = (method, params = {}) => new Promise((resolve) => { const callId = ++id; pending.set(callId, resolve); socket.send(JSON.stringify({ id: callId, method, params })) })
const evaluate = async (expression) => { const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result?.value }
const invoke = async (functionDeclaration, args = []) => { const target = await call("Runtime.evaluate", { expression: "globalThis" }); const result = await call("Runtime.callFunctionOn", { objectId: target.result.objectId, functionDeclaration, arguments: args.map((value) => ({ value })), awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result?.value }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const clickText = async (label) => { assert(await invoke("function(label) { const node=[...document.querySelectorAll('button')].find((item)=>item.textContent?.includes(label)); if(!node)return false; node.click(); return true }", [label]), `No se encontró ${label}`); await wait(300) }
const clickLabel = async (label) => { assert(await invoke("function(label) { const node=[...document.querySelectorAll('button[aria-label]')].find((item)=>item.getAttribute('aria-label')===label); if(!node)return false; node.click(); return true }", [label]), `No se encontró ${label}`); await wait(200) }

const semesterId = "qa-lite-semester", subjectId = "qa-lite-subject", noteId = "qa-lite-note"
const tutorialProgress = Object.fromEntries(["basic-tour","schedule-tour","grades-tour","reminders-tour","tools-tour","preferences-tour","assistant-tour","analytics-tour","notebook-tour","advanced-mode-tour"].map((key) => [key, { version: 2, status: "completed", currentStep: 99 }]))
const data = { subjects: [{ id: subjectId, semesterId, name: "ELECTROTECNIA II", color: "#7c3aed", icon: "Orbit", difficulty: 3, createdAt: Date.now() }], blocks: [], studyBlocks: [], reminders: [], modules: [], grades: [], assessmentGroups: [], subjectNotes: [{ id: noteId, semesterId, subjectId, title: "Prueba real", unit: "Unidad 1", content: "", document: { version: 1, blocks: [{ id: "p", type: "paragraph", content: [{ text: "" }] }] }, createdAt: Date.now(), updatedAt: Date.now() }], subjectNoteAttachments: [{ id: "legacy", semesterId, subjectId, noteId, kind: "pdf", filename: "guia-antigua.pdf", mimeType: "application/pdf", sizeBytes: 10, createdAt: Date.now() }], profile: { displayName: "Estudiante QA" }, settings: { theme: "light", language: "es", accentColor: "#7c3aed", fontFamily: "sans", fontScale: 1, timeFormat: "24h", radius: .875, blockOpacity: .9, focusMode: false, enableSaturday: false, visibleScheduleDays: ["lunes","martes","miercoles","jueves"], googleCalendarConnected: false, gradeScale: { min: 1, max: 7, passing: 4 }, onboarding: { currentStep: 0, completed: true }, advancedModeEnabled: false, tutorialProgress }, semesters: [{ id: semesterId, name: "Semestre QA", status: "active", createdAt: Date.now() }], activeSemesterId: semesterId, version: 6 }

await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await call("Page.navigate", { url: baseUrl }); await wait(1200)
await invoke("function(value) { localStorage.setItem('horario-escolar:v1', value) }", [JSON.stringify(data)])
await call("Page.navigate", { url: `${baseUrl}/?tab=cuaderno` }); await wait(1800); await clickText("Abrir cuaderno"); await clickText("Prueba real")
assert(await evaluate(`document.body.innerText.includes('Archivos de una versión anterior') && document.body.innerText.includes('guia-antigua.pdf')`), "No se preservaron attachments legacy")
const editor = `[data-testid="notebook-lite-editor"] [contenteditable="true"]`
assert(await evaluate(`Boolean(document.querySelector('${editor}'))`), "Editor Lite no montó")
await evaluate(`document.querySelector('${editor}').focus()`)
await call("Input.insertText", { text: "Primera línea" })
await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter" }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" })
const immediateEnter = await evaluate(`(() => { const root=document.querySelector('${editor}'); const selection=getSelection(); return { paragraphs:root.children.length, text:root.innerText, caretInside:root.contains(selection.anchorNode) } })()`)
assert(immediateEnter.paragraphs >= 2 && immediateEnter.caretInside, `Enter/caret no fue inmediato: ${JSON.stringify(immediateEnter)}`)
await call("Input.insertText", { text: "Segunda línea" }); await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter" }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" }); await call("Input.insertText", { text: "Tercera línea ñáé" }); await wait(300)

const selectText = async (needle) => assert(await invoke("function(needle) { const root=document.querySelector('[data-testid=\"notebook-lite-editor\"] [contenteditable=\"true\"]'); const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let node; while(node=walker.nextNode()){const at=node.textContent.indexOf(needle);if(at>=0){const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+needle.length);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return true}}return false }", [needle]), `No seleccionó ${needle}`)
await selectText("Primera línea"); await clickLabel("Negrita")
assert(await evaluate(`(() => { const root=document.querySelector('${editor}'); return [...root.querySelectorAll('strong,b,.font-bold')].some((node)=>node.textContent==='Primera línea') })()`), "Bold no aplicó exactamente")
await selectText("Primera línea"); await clickLabel("Negrita")
assert(!(await evaluate(`(() => [...document.querySelector('${editor}').querySelectorAll('strong,b,.font-bold')].some((node)=>node.textContent==='Primera línea'))()`)), "Bold OFF dejó residuo")
await selectText("Primera línea"); await clickLabel("Negrita"); await selectText("Segunda línea"); await clickLabel("Cursiva"); await selectText("Tercera línea ñáé"); await clickLabel("Subrayado")
assert(await evaluate(`(() => { const root=document.querySelector('${editor}'); return [...root.querySelectorAll('u,.underline')].some((node)=>node.textContent==='Tercera línea ñáé') })()`), "Underline no aplicó completo")
await selectText("Tercera línea ñáé"); await clickLabel("Subrayado")
assert(!(await evaluate(`(() => [...document.querySelector('${editor}').querySelectorAll('u,.underline')].some((node)=>node.textContent==='Tercera línea ñáé'))()`)), "Underline OFF dejó fragmentos")
await selectText("Tercera línea ñáé"); await clickLabel("Subrayado")

await selectText("Primera línea")
await evaluate(`document.querySelector('details summary').click()`)
await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,640,360);context.fillStyle='#6d28d9';context.font='42px sans-serif';context.fillText('PIZARRA QA',150,190);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));const file=new File([blob],'pizarra-qa.jpg',{type:'image/jpeg'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('[data-testid="gallery-input"]');Object.defineProperty(input,'files',{value:transfer.files,configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}))})()`)
await wait(1800)
assert(await evaluate(`document.querySelectorAll('[data-testid="notebook-lite-editor"] img').length===1 && document.body.innerText.includes('Foto insertada')`), "Foto no apareció inline")
assert(await evaluate(`(() => { const root=document.querySelector('${editor}'); const image=[...root.children].find((child)=>child.querySelector('figure')); return image && image.nextElementSibling?.tagName==='P' })()`), "No quedó párrafo después de la foto")
await wait(1500); await call("Page.reload"); await wait(1800); await clickText("Abrir cuaderno"); await clickText("Prueba real")
const reload = await evaluate(`({ text:document.querySelector('${editor}')?.innerText, images:document.querySelectorAll('[data-testid="notebook-lite-editor"] img').length, bold:document.querySelectorAll('${editor} strong,${editor} .font-bold').length, italic:document.querySelectorAll('${editor} em,${editor} .italic').length, underline:document.querySelectorAll('${editor} u,${editor} .underline').length })`)
assert(reload.images===1 && reload.bold>0 && reload.italic>0 && reload.underline>0 && reload.text.includes('Segunda línea'), `Reload incompleto: ${JSON.stringify(reload)}`)

await mkdir("docs/qa", { recursive: true }); const downloadDirectory = `docs/qa/notebook-lite-download-${Date.now()}`; await mkdir(downloadDirectory, { recursive: true })
await call("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: `${process.cwd()}\\${downloadDirectory.replaceAll("/", "\\")}` })
await clickText("Exportar PDF"); await wait(1600); let files = await readdir(downloadDirectory); assert(files.some((name) => name.endsWith(".pdf")), "PDF no fue descargado")
let shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile("docs/qa/notebook-lite-1440x900.png", Buffer.from(shot.data, "base64"))
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(400)
assert(await evaluate(`document.documentElement.scrollWidth<=390 && [...document.querySelectorAll('[aria-label="Formato del apunte"] button[aria-label]')].every((button)=>button.getBoundingClientRect().height>=44)`), "Toolbar mobile tiene overflow o targets pequeños")
shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile("docs/qa/notebook-lite-390x844.png", Buffer.from(shot.data, "base64"))
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); const nativeShare = await evaluate(`Boolean(navigator.share && navigator.canShare)`); await clickText("Compartir"); await wait(2200); files = await readdir(downloadDirectory); const shareMessage = await evaluate(`document.body.innerText.includes('El PDF se descargó')`); assert(files.some((name)=>name.endsWith('.pdf')) && (nativeShare || shareMessage), `Share incompleto: files=${JSON.stringify(files)}, native=${nativeShare}, message=${shareMessage}`)
socket.close(); console.log(JSON.stringify({ pass: true, immediateEnter, reload, downloadDirectory }))
