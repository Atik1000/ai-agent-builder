const MAX_LEN = 120

/** Returns a user-facing validation message, or null when the value is acceptable for save. */
export function validateAgentName(value: string): string | null {
  if (value.length > MAX_LEN) {
    return `Use at most ${MAX_LEN} characters.`
  }
  const trimmed = value.trim()
  if (value.length > 0 && trimmed.length === 0) {
    return 'Name cannot be only spaces.'
  }
  return null
}

/** True when the trimmed name is non-empty and passes validation. */
export function isAgentNameSaveable(value: string): boolean {
  const t = value.trim()
  if (t.length === 0) return false
  return validateAgentName(value) === null
}

/** Inline validation when the field has been touched or save was attempted. */
export function getAgentDisplayNameError(value: string, show: boolean): string | null {
  if (!show) return null
  if (value.trim().length === 0) {
    return 'Enter a name for your agent.'
  }
  return validateAgentName(value)
}
