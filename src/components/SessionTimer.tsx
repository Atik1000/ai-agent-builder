import { useSessionSeconds } from '../hooks/useSessionSeconds'

/** Uses isolated session clock hook so the rest of the builder is not affected each second. */
export function SessionTimer() {
  const seconds = useSessionSeconds()
  return (
    <span className="ab-session">
      Session active: <span className="ab-session__value">{seconds}s</span>
    </span>
  )
}
