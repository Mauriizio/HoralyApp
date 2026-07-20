export function sanitizeDisplayName(value: string) {
  return value.replace(/[<>]/g, "").trim().slice(0, 80)
}

export function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function validatePassword(value: string) {
  return value.length >= 8
}

export function validateAvatar(file: File) {
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"])
  if (!allowed.has(file.type)) return "El avatar debe ser PNG, JPG o WebP."
  if (file.size > 1024 * 1024 * 2) return "El avatar no puede superar 2 MB."
  return null
}

export function friendlyAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "Correo o contraseña incorrectos."
  if (lower.includes("already registered")) return "Este correo ya está registrado."
  if (lower.includes("password")) return "La contraseña debe tener al menos 8 caracteres."
  return "No se pudo completar la operación. Intenta nuevamente."
}
