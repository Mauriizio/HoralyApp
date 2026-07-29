const INSTALLATION_KEY = "horarily:installation-id:v1"

export function getOrCreateInstallationId(storage: Pick<Storage, "getItem" | "setItem">): string {
  const existing = storage.getItem(INSTALLATION_KEY)
  if (existing) return existing
  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  storage.setItem(INSTALLATION_KEY, generated)
  return generated
}

export function getPersistentTutorialIdentity(userId: string | null, storage: Pick<Storage, "getItem" | "setItem">): string {
  return userId ? `user:${userId}` : `installation:${getOrCreateInstallationId(storage)}`
}
