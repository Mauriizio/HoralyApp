import type { SupabaseClient } from "@supabase/supabase-js"
import { validateAvatar } from "@/lib/auth-utils"

export const AVATARS_BUCKET = "avatars"
export const AVATAR_CACHE_CONTROL = "31536000, immutable"
const GENERIC_UPLOAD_ERROR = "No se pudo subir el avatar. Intenta nuevamente."
const GENERIC_REMOVE_ERROR = "No se pudo eliminar el avatar. Intenta nuevamente."
const PUBLIC_STORAGE_PREFIX = `/storage/v1/object/public/${AVATARS_BUCKET}/`
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "webp"])

type AvatarOperation = "upload" | "remove"
type StorageErrorLike = {
  statusCode?: string | number
  status?: string | number
  error?: string
  message?: string
  name?: string
}

function safeStorageError(error: unknown): StorageErrorLike {
  if (!error || typeof error !== "object") return { message: String(error) }
  const source = error as StorageErrorLike
  return {
    statusCode: source.statusCode ?? source.status,
    error: source.error ?? source.name,
    message: source.message,
  }
}

function classifyStorageError(error: unknown) {
  const safeError = safeStorageError(error)
  const statusCode = String(safeError.statusCode ?? "")
  const message = `${safeError.error ?? ""} ${safeError.message ?? ""}`.toLowerCase()
  if (statusCode === "403" || message.includes("row-level security") || message.includes("rls") || message.includes("permission")) return "rls_403"
  if (statusCode === "409" || message.includes("already exists") || message.includes("duplicate")) return "file_exists"
  if (!statusCode && (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch"))) return "network"
  return "unknown"
}

function friendlyStorageMessage(operation: AvatarOperation, error: unknown) {
  const kind = classifyStorageError(error)
  if (kind === "rls_403") return "No tienes permiso para modificar ese avatar."
  if (kind === "file_exists") return "El avatar ya existe. Intenta reemplazarlo nuevamente."
  if (kind === "network") return "No se pudo conectar con el almacenamiento. Revisa tu conexión e intenta nuevamente."
  return operation === "upload" ? GENERIC_UPLOAD_ERROR : GENERIC_REMOVE_ERROR
}

function logStorageError(operation: AvatarOperation, error: unknown) {
  if (process.env.NODE_ENV === "production") return
  const safeError = safeStorageError(error)
  console.error("[Horaly] Error de Storage avatars", {
    statusCode: safeError.statusCode,
    error: safeError.error,
    message: safeError.message,
    bucket: AVATARS_BUCKET,
    operation,
  })
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  return "jpg"
}

function avatarVersionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const random = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("")
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return random.replace(/[^a-zA-Z0-9-]/g, "")
}

export function avatarPath(userId: string, file: File) {
  return `${userId}/avatars/${avatarVersionId()}.${extensionFor(file)}`
}

export function isOwnedAvatarPath(path: string | null | undefined, userId: string) {
  if (!path || !userId) return false
  let decoded: string
  try { decoded = decodeURIComponent(path) } catch { return false }
  if (decoded !== path || decoded.includes("\\") || decoded.includes("//") || decoded.split("/").includes("..")) return false
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const legacy = new RegExp(`^${escapedUserId}/avatar\\.(png|jpg|webp)$`)
  const versioned = new RegExp(`^${escapedUserId}/avatars/[0-9a-zA-Z-]+\\.(png|jpg|webp)$`)
  const extension = decoded.split(".").pop()
  return Boolean(extension && ALLOWED_EXTENSIONS.has(extension) && (legacy.test(decoded) || versioned.test(decoded)))
}

export function extractAvatarPathFromPublicUrl(url: string | null | undefined, userId: string) {
  if (!url) return null
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }
  if (parsed.search || parsed.hash) return null
  const configuredOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : null
  if (configuredOrigin && parsed.origin !== configuredOrigin) return null
  const prefixIndex = parsed.pathname.indexOf(PUBLIC_STORAGE_PREFIX)
  if (prefixIndex < 0) return null
  const encodedPath = parsed.pathname.slice(prefixIndex + PUBLIC_STORAGE_PREFIX.length)
  let path: string
  try { path = decodeURIComponent(encodedPath) } catch { return null }
  if (!isOwnedAvatarPath(path, userId)) return null
  return path
}

async function ensureSession(client: SupabaseClient, operation: AvatarOperation) {
  const { data, error } = await client.auth.getSession()
  if (error) {
    logStorageError(operation, error)
    throw new Error("No se pudo validar tu sesión. Inicia sesión nuevamente.")
  }
  if (!data.session) throw new Error("Debes iniciar sesión para modificar tu avatar.")
}

export async function uploadAvatar(client: SupabaseClient, userId: string, file: File) {
  const validation = validateAvatar(file)
  if (validation) throw new Error(validation)
  await ensureSession(client, "upload")
  const path = avatarPath(userId, file)
  const { error } = await client.storage.from(AVATARS_BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: AVATAR_CACHE_CONTROL })
  if (error) {
    logStorageError("upload", error)
    throw new Error(friendlyStorageMessage("upload", error))
  }
  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function removeAvatar(client: SupabaseClient, userId: string, avatar: string | null | undefined) {
  await ensureSession(client, "remove")
  const path = isOwnedAvatarPath(avatar, userId) ? avatar : extractAvatarPathFromPublicUrl(avatar, userId)
  if (!path) return { removed: false as const, path: null }
  const { error } = await client.storage.from(AVATARS_BUCKET).remove([path])
  if (error) {
    logStorageError("remove", error)
    throw new Error(friendlyStorageMessage("remove", error))
  }
  return { removed: true as const, path }
}

export async function cleanupAvatar(client: SupabaseClient, userId: string, avatar: string | null | undefined) {
  try {
    return await removeAvatar(client, userId, avatar)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[Horaly] Limpieza de avatar pendiente", { userId, avatar, error: safeStorageError(error) })
    return { removed: false as const, path: null, pending: true as const }
  }
}
