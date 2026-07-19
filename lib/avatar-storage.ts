import type { SupabaseClient } from "@supabase/supabase-js"
import { validateAvatar } from "@/lib/auth-utils"

export function avatarPath(userId: string, file: File) {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  return `${userId}/avatar.${extension}`
}

export async function uploadAvatar(client: SupabaseClient, userId: string, file: File) {
  const validation = validateAvatar(file)
  if (validation) throw new Error(validation)
  const path = avatarPath(userId, file)
  const { error } = await client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error("No se pudo subir el avatar. Intenta nuevamente.")
  const { data } = client.storage.from("avatars").getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function removeAvatar(client: SupabaseClient, userId: string) {
  const paths = ["png", "jpg", "webp"].map((extension) => `${userId}/avatar.${extension}`)
  const { error } = await client.storage.from("avatars").remove(paths)
  if (error) throw new Error("No se pudo eliminar el avatar. Intenta nuevamente.")
}
