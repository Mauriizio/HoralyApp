import assert from "node:assert/strict"
import test from "node:test"
import { safeAttachmentFilename, validateNoteFile } from "../domain/notebook/attachments.ts"

test("allowlist acepta JPEG PNG WebP PDF", () => { for (const file of [{ name: "a.jpg", type: "image/jpeg" }, { name: "a.png", type: "image/png" }, { name: "a.webp", type: "image/webp" }, { name: "a.pdf", type: "application/pdf" }]) assert.equal(validateNoteFile({ ...file, size: 10 }), null) })
test("rechaza HTML JS ZIP EXE SVG MIME inconsistente y oversize", () => { for (const file of [{ name: "a.html", type: "text/html" }, { name: "a.zip", type: "application/zip" }, { name: "a.exe", type: "application/octet-stream" }, { name: "a.js", type: "text/javascript" }, { name: "a.svg", type: "image/svg+xml" }]) assert.match(validateNoteFile({ ...file, size: 10 })!, /no permitido/); assert.match(validateNoteFile({ name: "fake.pdf", type: "image/jpeg", size: 10 })!, /extensión/); assert.match(validateNoteFile({ name: "a.pdf", type: "application/pdf", size: 16 * 1024 * 1024 })!, /límite/) })
test("sanitiza traversal y nombres maliciosos", () => { assert.equal(safeAttachmentFilename("..\\..\\<script>.pdf"), "script-.pdf"); assert.equal(safeAttachmentFilename("../../guía laboratorio.pdf"), "guia-laboratorio.pdf") })
