import type { SupabaseClient } from "@supabase/supabase-js"
import { validateAvatar } from "@/lib/auth-utils"

const AVATARS_BUCKET = "avatars"
const GENERIC_UPLOAD_ERROR = "No se pudo subir el avatar. Intenta nuevamente."
const GENERIC_REMOVE_ERROR = "No se pudo eliminar el avatar. Intenta nuevamente."

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

export function avatarPath(userId: string, file: File) {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  return `${userId}/avatar.${extension}`
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
  const { error } = await client.storage.from(AVATARS_BUCKET).upload(path, file, { upsert: true, contentType: file.type })
  if (error) {
    logStorageError("upload", error)
    throw new Error(friendlyStorageMessage("upload", error))
  }
  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function removeAvatar(client: SupabaseClient, userId: string) {
  await ensureSession(client, "remove")
  const paths = ["png", "jpg", "webp"].map((extension) => `${userId}/avatar.${extension}`)
  const { error } = await client.storage.from(AVATARS_BUCKET).remove(paths)
  if (error) {
    logStorageError("remove", error)
    throw new Error(friendlyStorageMessage("remove", error))
  }
}
