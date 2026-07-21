export class SessionIdentityMismatchError extends Error {
  constructor(message = "La sesión cambió durante la operación. Vuelve a intentarlo.") {
    super(message)
    this.name = "SessionIdentityMismatchError"
  }
}

export type OperationIdentityContext = {
  expectedUserId: string
  expectedAuthGeneration: number
}

export function shortIdentity(value: string | null | undefined) {
  if (!value) return null
  return value.length <= 8 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function logIdentity(event: {
  authEvent?: string
  authUserId?: string | null
  verifiedUserId?: string | null
  repositoryOwnerUserId?: string | null
  dataOwnerUserId?: string | null
  authGeneration?: number
  operation?: string
  mismatch?: string
}) {
  if (process.env.NODE_ENV === "production") return
  console.info("[Horaly Identity]", {
    authEvent: event.authEvent,
    authUserId: shortIdentity(event.authUserId),
    verifiedUserId: shortIdentity(event.verifiedUserId),
    repositoryOwnerUserId: shortIdentity(event.repositoryOwnerUserId),
    dataOwnerUserId: shortIdentity(event.dataOwnerUserId),
    authGeneration: event.authGeneration,
    operation: event.operation,
    mismatch: event.mismatch,
  })
}

export function assertSameIdentity(actual: string | null | undefined, expected: string, mismatch: string): asserts actual is string {
  if (actual !== expected) throw new SessionIdentityMismatchError(mismatch)
}

export function assertSameGeneration(actual: number, expected: number, mismatch = "La sesión cambió durante la operación. Vuelve a intentarlo.") {
  if (actual !== expected) throw new SessionIdentityMismatchError(mismatch)
}
