const DB_NAME = "horarily-notebook-files"
const STORE = "blobs"

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}

export const notebookBlobRepository = {
  async put(namespace: string, blob: Blob) { const db = await database(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(blob, namespace); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }); db.close() },
  async get(namespace: string) { const db = await database(); const result = await new Promise<Blob | undefined>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).get(namespace); request.onsuccess = () => resolve(request.result as Blob | undefined); request.onerror = () => reject(request.error) }); db.close(); return result },
  async remove(namespace: string) { const db = await database(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(namespace); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }); db.close() },
}
