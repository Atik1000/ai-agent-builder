import { useEffect, useState } from 'react'

/** Isolated timer so the rest of the app does not re-render every second. */
export function SessionTimer() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span className="text-slate-400 text-sm tabular-nums">
      Session active: <span className="text-teal-300 font-medium">{seconds}s</span>
    </span>
  )
}
